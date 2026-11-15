import type { DefaultSession } from "next-auth";

import type { Role } from "@/lib/users";

/** Champs ajoutés à l'utilisateur et à la session par notre configuration NextAuth. */
declare module "next-auth" {
  interface User {
    username: string;
    role: Role;
  }

  interface Session {
    user: {
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }
}
