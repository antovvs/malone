import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Garde d'accès (l'ancien « middleware » de Next.js, renommé proxy en v16).
 * Toutes les routes exigent une session valide, sauf la page de connexion,
 * les points d'entrée NextAuth et les fichiers statiques.
 */
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);
  const isLoginPage = pathname === "/login";

  if (isLoggedIn) {
    // Déjà connecté : la page de connexion n'a plus d'intérêt.
    return isLoginPage ? NextResponse.redirect(new URL("/", request.nextUrl)) : NextResponse.next();
  }
  if (isLoginPage) return NextResponse.next();

  // Une API répond 401 en JSON ; une page redirige vers la connexion.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.nextUrl);
  if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  // Tout, sauf NextAuth, les fichiers internes de Next.js et les assets statiques.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
