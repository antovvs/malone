import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginLimiter } from "@/lib/rate-limit";
import { findUser, type Role } from "@/lib/users";

/**
 * Authentification du dashboard (Auth.js / NextAuth v5).
 *
 *  - Connexion par identifiant + mot de passe, vérifié contre un hash bcrypt.
 *  - Session sous forme de JWT signé, dans un cookie httpOnly / sameSite strict :
 *    aucune base de données de sessions.
 *  - Jeton CSRF géré par NextAuth sur toutes les requêtes de connexion.
 *  - Anti brute-force par IP (voir src/lib/rate-limit.ts).
 */

/** Durée de session en heures (24 h par défaut). */
const SESSION_HOURS = Number(process.env.SESSION_MAX_AGE_HOURS) > 0
  ? Number(process.env.SESSION_MAX_AGE_HOURS)
  : 24;

/** Erreur renvoyée au formulaire quand l'IP est bloquée ou va trop vite. */
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Hash factice, comparé quand l'identifiant n'existe pas : la réponse prend
 * ainsi le même temps que pour un vrai compte, ce qui empêche de deviner les
 * identifiants valides en chronométrant le serveur.
 */
const DUMMY_HASH = bcrypt.hashSync("identifiant-inconnu", 10);

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "inconnue";
}

/** Journal des connexions : une ligne JSON par tentative (IP, identifiant, résultat). */
function logAttempt(outcome: "success" | "failure" | "blocked", ip: string, username: string) {
  const line = JSON.stringify({
    event: "login",
    outcome,
    ip,
    // Identifiant tronqué : un mot de passe tapé par erreur dans ce champ ne doit pas finir entier dans les logs.
    username: username.slice(0, 64),
    at: new Date().toISOString(),
  });
  if (outcome === "success") console.info(line);
  else console.warn(line);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  // L'hôte est celui de la requête (Vercel, VPS derrière un proxy, localhost).
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_HOURS * 60 * 60 },
  pages: { signIn: "/login" },
  cookies: {
    // sameSite strict : le cookie de session ne part jamais avec une requête venue d'un autre site.
    sessionToken: { options: { httpOnly: true, sameSite: "strict", path: "/" } },
  },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials, request) {
        const username = typeof credentials?.username === "string" ? credentials.username : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        const ip = clientIp(request);

        const verdict = loginLimiter.check(ip);
        if (!verdict.allowed) {
          logAttempt("blocked", ip, username);
          throw new RateLimitedError();
        }

        const user = findUser(username);
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) {
          loginLimiter.recordFailure(ip);
          logAttempt("failure", ip, username);
          return null;
        }

        loginLimiter.recordSuccess(ip);
        logAttempt("success", ip, user.username);
        return { id: user.id, name: user.displayName, username: user.username, role: user.role };
      },
    }),
  ],
  callbacks: {
    // À la connexion, on range l'identifiant et le rôle dans le JWT…
    jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    // … puis on les expose dans la session lue par l'interface.
    session({ session, token }) {
      session.user.username = (token.username as string | undefined) ?? "";
      session.user.role = (token.role as Role | undefined) ?? "manager";
      return session;
    },
  },
  logger: {
    error(error) {
      // Un mot de passe refusé est déjà journalisé ci-dessus : inutile d'y ajouter une pile d'erreur.
      if (error.name === "CredentialsSignin" || error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
});
