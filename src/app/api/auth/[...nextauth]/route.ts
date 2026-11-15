import { handlers } from "@/auth";

/** Points d'entrée NextAuth : connexion, déconnexion, session, jeton CSRF. */
export const { GET, POST } = handlers;
