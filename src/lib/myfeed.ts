import "server-only";

import { demoCall } from "@/lib/myfeed-demo";
import type { MyFeedList } from "@/types/myfeed";

/**
 * Client serveur de l'API MyFeed.
 *
 * MyFeed expose ses données sous forme de serveur MCP : chaque « endpoint »
 * (get_revenue, get_sales…) est un outil appelé en JSON-RPC (`tools/call`) sur
 * une seule URL, avec la clé API en `Authorization: Bearer`. Tout passe par
 * `callTool`, donc changer de transport (MYFEED_API_MODE=rest) ne touche que
 * ce fichier.
 *
 * La clé API de l'agence vit dans la variable d'environnement MYFEED_API_KEY.
 * Ce module ne tourne que côté serveur (`server-only`) : la clé n'entre jamais
 * dans le code envoyé au navigateur.
 */

export class MyFeedError extends Error {
  constructor(
    message: string,
    /** Statut HTTP à renvoyer au navigateur. */
    public readonly status: number,
  ) {
    super(message);
    this.name = "MyFeedError";
  }
}

export type ToolArgs = Record<string, string | number | boolean>;

/**
 * Liste blanche des outils accessibles depuis le dashboard : uniquement de la
 * LECTURE. Les outils qui modifient MyFeed (set_ai_enabled, delete_script,
 * set_sale_chatter…) ne sont volontairement pas exposés par le proxy.
 */
export const READ_TOOLS: ReadonlySet<string> = new Set([
  "get_me",
  // Modèles & équipe
  "list_models",
  "list_chatters",
  "get_chatter_activity",
  "get_chatter_sales",
  // Revenus & ventes
  "get_revenue",
  "get_sales",
  "get_balance",
  "get_payouts",
  "get_refunds",
  // Abonnés
  "get_subscribers",
  "get_referrals",
  // Conversations & coaching
  "list_conversations",
  "get_conversation_messages",
  "search_messages",
  "get_coaching_audits",
  "get_coaching_board",
  "get_coaching_criteria",
  "get_coaching_reviews",
  "get_coaching_warnings",
  // PPV & push
  "get_ppv_conversion",
  "get_ppv_offers",
  "get_pushes",
  // IA de chatting
  "get_ai_settings",
  "get_ai_script_stats",
  // Scripts
  "list_scripts",
  "get_script",
  // Link in bio & tracking
  "list_link_pages",
  "get_link_buttons_stats",
  "get_link_pages_stats",
  "get_tracking_links",
  "get_tracking_links_history",
  // SFS & planning
  "get_sfs_schedule",
  "list_sfs_deals",
  "get_schedule",
  "get_attendance",
  // OnlyFans
  "list_onlyfans_accounts",
  "get_onlyfans_revenue",
  "get_onlyfans_sales",
  "get_onlyfans_subscribers",
  "get_onlyfans_balance",
  "list_onlyfans_conversations",
  "get_onlyfans_conversation_messages",
  "get_onlyfans_chatter_sales",
]);

const REQUEST_TIMEOUT_MS = 30_000;

function config() {
  return {
    url: process.env.MYFEED_API_URL ?? "https://myfeed.fans/mcp",
    mode: process.env.MYFEED_API_MODE === "rest" ? ("rest" as const) : ("mcp" as const),
  };
}

export type MyFeedMode = "live" | "demo" | "unconfigured";

/**
 * D'où viennent les données :
 *  - live : la vraie API MyFeed (MYFEED_API_KEY renseignée) ;
 *  - demo : données fictives (MYFEED_DEMO=1), pour montrer l'interface sans clé ;
 *  - unconfigured : ni clé ni démo, le dashboard affiche un état vide.
 */
export function myfeedMode(): MyFeedMode {
  if (process.env.MYFEED_API_KEY?.trim()) return "live";
  const demo = process.env.MYFEED_DEMO;
  return demo === "1" || demo === "true" ? "demo" : "unconfigured";
}

/** Appelle un outil MyFeed et renvoie sa réponse JSON. */
export async function callTool<T>(tool: string, args: ToolArgs = {}): Promise<T> {
  if (!READ_TOOLS.has(tool)) {
    throw new MyFeedError(`Outil MyFeed inconnu ou non autorisé : ${tool}`, 404);
  }
  const dataMode = myfeedMode();
  if (dataMode === "demo") return demoCall(tool, args) as T;
  if (dataMode === "unconfigured") {
    throw new MyFeedError("Clé API MyFeed non configurée (MYFEED_API_KEY).", 503);
  }
  const apiKey = process.env.MYFEED_API_KEY!.trim();

  const { url, mode } = config();
  try {
    return mode === "rest"
      ? await callRest<T>(url, apiKey, tool, args)
      : await callMcp<T>(url, apiKey, tool, args);
  } catch (error) {
    if (error instanceof MyFeedError) throw error;
    // Réseau coupé, DNS, délai dépassé…
    throw new MyFeedError(
      `MyFeed est injoignable (${error instanceof Error ? error.message : "erreur réseau"}).`,
      502,
    );
  }
}

/** Nombre maximal de pages suivies par `callToolAll`, pour borner la durée d'une requête. */
const MAX_PAGES = 20;

/**
 * Suit la pagination (has_more / next_offset) jusqu'au bout et renvoie toutes
 * les lignes d'un coup. Indispensable pour les ventes : un mois chargé dépasse
 * vite la page de 1000 lignes, et un total calculé sur une seule page serait faux.
 */
export async function callToolAll<Row>(
  tool: string,
  args: ToolArgs = {},
): Promise<MyFeedList<Row>> {
  const first = await callTool<MyFeedList<Row>>(tool, args);
  const rows = [...(first.data ?? [])];
  let page = first;
  let pages = 1;

  while (page.has_more && page.next_offset != null && pages < MAX_PAGES) {
    page = await callTool<MyFeedList<Row>>(tool, {
      ...args,
      offset: page.next_offset,
    });
    rows.push(...(page.data ?? []));
    pages += 1;
  }

  return {
    ...first,
    data: rows,
    has_more: false,
    next_offset: null,
    // S'il reste des pages après le plafond, on le signale plutôt que de mentir sur le total.
    truncated: Boolean(page.has_more),
  };
}

/* ------------------------------------------------------------------ */
/* Transport MCP (JSON-RPC sur HTTP)                                    */
/* ------------------------------------------------------------------ */

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number | string | null;
  result?: {
    content?: { type: string; text?: string }[];
    structuredContent?: unknown;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

interface RpcReply {
  status: number;
  sessionId: string | null;
  message: JsonRpcResponse | null;
}

let nextRpcId = 1;

/** Session MCP en cours, pour les serveurs qui en exigent une. */
let mcpSession: string | undefined;

async function postRpc(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<RpcReply> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Un serveur MCP peut répondre en JSON simple ou en flux SSE : on accepte les deux.
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${apiKey}`,
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  return {
    status: response.status,
    sessionId: response.headers.get("mcp-session-id"),
    message: parseRpcBody(text, response.headers.get("content-type") ?? "", body.id),
  };
}

/** Extrait la réponse JSON-RPC d'un corps JSON ou d'un flux SSE (`data: {...}`). */
function parseRpcBody(
  text: string,
  contentType: string,
  expectedId: unknown,
): JsonRpcResponse | null {
  if (!text) return null;
  const candidates: string[] = contentType.includes("text/event-stream")
    ? text
        .split(/\r?\n\r?\n/)
        .map((event) =>
          event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n"),
        )
        .filter(Boolean)
    : [text];

  let fallback: JsonRpcResponse | null = null;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as JsonRpcResponse;
      if (parsed.id === expectedId) return parsed;
      if (parsed.result || parsed.error) fallback = parsed;
    } catch {
      // Ligne SSE non JSON (ping, commentaire) : ignorée.
    }
  }
  return fallback;
}

/** Poignée de main MCP, pour les serveurs qui exigent une session avant tools/call. */
async function openMcpSession(url: string, apiKey: string): Promise<string | undefined> {
  const reply = await postRpc(url, apiKey, {
    jsonrpc: "2.0",
    id: nextRpcId++,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "myfeed-dashboard", version: "0.1.0" },
    },
  });
  assertAuthorized(reply.status);
  const sessionId = reply.sessionId ?? undefined;
  await postRpc(
    url,
    apiKey,
    { jsonrpc: "2.0", method: "notifications/initialized" },
    sessionId,
  );
  return sessionId;
}

function assertAuthorized(status: number) {
  if (status === 401 || status === 403) {
    throw new MyFeedError("Clé API MyFeed refusée ou expirée.", 401);
  }
}

function needsSession(reply: RpcReply): boolean {
  if (reply.status === 400 || reply.status === 404) return true;
  const message = reply.message?.error?.message ?? "";
  return /session|initiali[sz]/i.test(message);
}

async function callMcp<T>(
  url: string,
  apiKey: string,
  tool: string,
  args: ToolArgs,
): Promise<T> {
  const call = () => ({
    jsonrpc: "2.0",
    id: nextRpcId++,
    method: "tools/call",
    params: { name: tool, arguments: args },
  });

  let reply = await postRpc(url, apiKey, call(), mcpSession);
  assertAuthorized(reply.status);

  // Serveur à session (ou session expirée) : on ouvre une session et on réessaie une fois.
  if (needsSession(reply)) {
    mcpSession = await openMcpSession(url, apiKey);
    reply = await postRpc(url, apiKey, call(), mcpSession);
    assertAuthorized(reply.status);
  }

  const { message, status } = reply;
  if (message?.error) throw new MyFeedError(message.error.message, 502);
  if (!message?.result) {
    throw new MyFeedError(`Réponse MyFeed inattendue (HTTP ${status}).`, 502);
  }

  const { result } = message;
  const text = result.content?.find((part) => part.type === "text")?.text;
  if (result.isError) {
    // Erreur métier renvoyée par l'outil (droit manquant, période trop longue…).
    throw new MyFeedError(text ?? `L'outil ${tool} a échoué.`, 400);
  }
  if (result.structuredContent !== undefined) return result.structuredContent as T;
  if (text === undefined) {
    throw new MyFeedError(`L'outil ${tool} n'a renvoyé aucune donnée.`, 502);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MyFeedError(`Réponse illisible pour l'outil ${tool}.`, 502);
  }
}

/* ------------------------------------------------------------------ */
/* Transport REST (optionnel, MYFEED_API_MODE=rest)                     */
/* ------------------------------------------------------------------ */

async function callRest<T>(
  baseUrl: string,
  apiKey: string,
  tool: string,
  args: ToolArgs,
): Promise<T> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${tool}`);
  for (const [key, value] of Object.entries(args)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  assertAuthorized(response.status);
  if (!response.ok) {
    throw new MyFeedError(`MyFeed a répondu HTTP ${response.status}.`, 502);
  }
  return (await response.json()) as T;
}
