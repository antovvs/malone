import "server-only";

/**
 * Comptes autorisés à ouvrir le dashboard.
 *
 * Il n'y a pas de base de données : les comptes sont déclarés dans les
 * variables d'environnement, et seul le HASH bcrypt du mot de passe y figure.
 * Aucun mot de passe en clair n'existe dans le code ni dans le dépôt.
 *
 *   USER_1_ID=prenom              identifiant de connexion
 *   USER_1_HASH=…                 hash bcrypt (voir `npm run hash-password`)
 *   USER_1_NAME=Prénom Nom        nom affiché (optionnel)
 *   USER_1_ROLE=manager           admin | manager (optionnel, manager par défaut)
 *
 * Pour ajouter une personne : ajouter un bloc USER_3_…, USER_4_…
 */

export type Role = "admin" | "manager";

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
}

/** Nombre maximal de blocs USER_n_ lus. */
const MAX_USERS = 50;

/**
 * Un hash bcrypt contient des « $ », que les fichiers .env interprètent comme
 * des variables. Le script de génération l'encode donc en base64 ; on accepte
 * les deux formes (hash brut, comme sur Vercel, ou base64).
 */
function decodeHash(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("$2")) return raw;
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  return decoded.startsWith("$2") ? decoded : null;
}

export function getUsers(): AppUser[] {
  const users: AppUser[] = [];
  for (let n = 1; n <= MAX_USERS; n++) {
    const id = process.env[`USER_${n}_ID`]?.trim();
    const passwordHash = decodeHash(process.env[`USER_${n}_HASH`]);
    // Un compte sans hash valide n'existe pas : mieux vaut un accès refusé qu'un accès sans mot de passe.
    if (!id || !passwordHash) continue;
    users.push({
      id,
      username: id,
      passwordHash,
      displayName: process.env[`USER_${n}_NAME`]?.trim() || id,
      // Les deux rôles voient tout pour l'instant ; la distinction est prête pour plus tard.
      role: process.env[`USER_${n}_ROLE`]?.trim() === "admin" ? "admin" : "manager",
    });
  }
  return users;
}

/** Recherche insensible à la casse et aux espaces autour de l'identifiant. */
export function findUser(username: string): AppUser | undefined {
  const wanted = username.trim().toLowerCase();
  return getUsers().find((user) => user.username.toLowerCase() === wanted);
}
