import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { callTool, callToolAll, MyFeedError, myfeedMode, type ToolArgs } from "@/lib/myfeed";

/**
 * Proxy vers MyFeed : GET /api/myfeed/<outil>?<paramètres>
 *
 * Le navigateur n'appelle jamais MyFeed directement. Il passe par ici : on
 * vérifie la session de l'utilisateur, puis le serveur ajoute la clé API de
 * l'agence (variable d'environnement, jamais envoyée au navigateur).
 *
 *   /api/myfeed/get_revenue?from=2026-11-01&to=2026-11-14&by=day
 *   /api/myfeed/get_sales?from=…&to=…&all=1   ← all=1 : suit toute la pagination
 */

/** Paramètres que MyFeed attend en nombre (le reste est transmis en texte). */
const NUMERIC_PARAMS = new Set(["limit", "offset", "model_id", "chatter_id", "script_id", "id"]);

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/myfeed/[...path]">,
) {
  // Le proxy.ts filtre déjà les visiteurs non connectés ; on revérifie ici,
  // au plus près des données, pour ne jamais dépendre d'une seule barrière.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const { path } = await context.params;
  const tool = path.join("/");

  const args: ToolArgs = {};
  let fetchAll = false;
  for (const [key, value] of request.nextUrl.searchParams) {
    if (value === "") continue;
    if (key === "all") {
      fetchAll = value === "1" || value === "true";
    } else if (NUMERIC_PARAMS.has(key) && /^\d+$/.test(value)) {
      args[key] = Number(value);
    } else {
      args[key] = value;
    }
  }

  // Données privées de l'agence : jamais de cache partagé. L'en-tête X-Data-Mode
  // dit à l'interface si elle affiche de vraies données ou la démo.
  const headers = { "Cache-Control": "private, no-store", "X-Data-Mode": myfeedMode() };

  try {
    const data = fetchAll ? await callToolAll(tool, args) : await callTool(tool, args);
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof MyFeedError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error(`[myfeed proxy] ${tool}`, error);
    return NextResponse.json({ error: "Erreur interne du proxy MyFeed." }, { status: 500, headers });
  }
}
