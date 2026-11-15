# Malone

Tableau de bord analytique d'agence, branché sur l'API MyFeed (CRM des modèles MYM) :
revenus, ventes, abonnés, conversion PPV, et des « points à améliorer » générés
automatiquement. Accès réservé aux personnes à qui un identifiant a été donné.

> Capture d'écran du dashboard : à ajouter dans `docs/dashboard.png`.

## Installation

```bash
npm install
```

Copier `.env.example` en `.env.local`, puis renseigner :

| Variable | Rôle |
| --- | --- |
| `NEXTAUTH_SECRET` | Secret qui signe les sessions. `openssl rand -base64 32` |
| `USER_n_ID` / `USER_n_HASH` | Comptes autorisés (voir ci-dessous) |
| `MYFEED_API_KEY` | Clé API MyFeed de l'agence (reste côté serveur) |
| `MYFEED_API_URL` | Point d'entrée MyFeed, `https://myfeed.fans/mcp` par défaut |
| `MYFEED_DEMO` | `1` pour afficher des données fictives tant qu'il n'y a pas de clé |

```bash
npm run dev
```

Ouvrir http://localhost:3000 et se connecter.

## Ajouter un utilisateur

1. Générer le hash de son mot de passe (la saisie est masquée, rien n'est enregistré) :

   ```bash
   npm run hash-password
   ```

2. Coller les lignes affichées dans `.env.local` (ou dans les variables d'environnement
   de l'hébergeur), en prenant le prochain numéro libre : `USER_3_ID`, `USER_3_HASH`,
   `USER_3_NAME`, `USER_3_ROLE` (`admin` ou `manager`).
3. Redémarrer le serveur.

Pour retirer un accès, supprimer le bloc `USER_n_…` correspondant. Les deux rôles voient
tout pour l'instant ; la distinction est prête dans la session (`session.user.role`).

## Sécurité

- **Mots de passe** : seuls des hash bcrypt (coût 12) existent, dans les variables
  d'environnement. Aucun mot de passe en clair dans le code ni dans le dépôt.
- **Session** : JWT signé, cookie `httpOnly` / `sameSite=strict` / `secure` en HTTPS,
  expiration après 24 h. Jeton CSRF géré par NextAuth.
- **Routes** : tout exige une session, sauf `/login` et `/api/auth/*` (`src/proxy.ts`).
  Le proxy MyFeed revérifie la session avant chaque appel.
- **Anti brute-force** : 5 tentatives par minute et par IP ; 5 échecs bloquent l'IP
  15 minutes. Chaque tentative est journalisée (IP, identifiant, résultat, date).
  Le compteur est en mémoire : sur un hébergement à plusieurs instances (Vercel), il
  n'est pas partagé entre elles. Pour une limite stricte, le brancher sur Redis.
- **Clé API MyFeed** : lue uniquement par `src/lib/myfeed.ts` (`server-only`), jamais
  dans le code envoyé au navigateur. Le proxy n'expose que des outils de lecture.
- **En-têtes** : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Content-Security-Policy`, et HSTS en production (`next.config.ts`).

## Vérifications

```bash
npm run build
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Recharts ·
Auth.js (NextAuth v5) · bcryptjs.

## Structure

| Chemin | Contenu |
| --- | --- |
| `src/auth.ts` | Configuration NextAuth : comptes, JWT, anti brute-force, journal |
| `src/proxy.ts` | Garde d'accès : sans session → `/login` |
| `src/lib/users.ts` | Lecture des comptes depuis les variables d'environnement |
| `src/lib/rate-limit.ts` | Limiteur de tentatives de connexion |
| `src/app/login` | Page de connexion |
| `src/app/(app)` | Pages connectées (dashboard et sections) |
| `src/app/api/myfeed/[...path]` | Proxy vers MyFeed |
| `src/lib/myfeed.ts` | Client serveur MyFeed (MCP / REST, pagination, liste blanche) |
| `src/lib/analytics.ts` | Métriques dérivées (ARPU, panier moyen, conversion, évolutions) |
| `src/lib/recommendations.ts` | Règles des « points à améliorer » |
| `src/components/layout` | Barre latérale, en-tête, navigation mobile, déconnexion |
| `src/components/dashboard`, `charts` | Tuiles d'indicateurs et graphiques |
| `scripts/hash-password.mjs` | Génération d'un hash de mot de passe |

## Avancement

- [x] Authentification, page de connexion, protection des routes
- [x] Dashboard principal : indicateurs, graphiques, alertes, points à améliorer
- [x] Navigation mobile : menu tiroir, barre du bas, cibles tactiles de 44 px
- [ ] Pages Revenus, Abonnés, Chatteurs, PPV & Push, IA, Scripts, Trafic, Planning,
      Finances (écrans « Bientôt » pour l'instant)
- [ ] Rapport automatique (PDF)

## Déploiement (Vercel)

Renseigner dans les variables d'environnement du projet : `NEXTAUTH_SECRET`, les blocs
`USER_n_…`, `MYFEED_API_KEY`, `MYFEED_API_URL`. Sur Vercel, `USER_n_HASH` accepte le hash
bcrypt tel quel ou encodé en base64 (ce que produit `npm run hash-password`).
