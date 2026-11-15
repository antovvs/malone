/**
 * Génère le hash bcrypt d'un mot de passe, prêt à coller dans .env.local.
 *
 *   npm run hash-password
 *
 * Le mot de passe est saisi au clavier sans être affiché : il n'apparaît ni
 * dans l'historique du terminal, ni dans un fichier. Seul le hash est imprimé.
 */
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";

import bcrypt from "bcryptjs";

/** Coût bcrypt : 12 ≈ 250 ms par vérification, ce qui freine fortement le brute-force. */
const COST = 12;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    if (hidden) {
      // On laisse passer la question, puis on masque ce qui est tapé.
      let prompted = false;
      rl._writeToOutput = (text) => {
        if (!prompted) {
          stdout.write(text);
          prompted = true;
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) stdout.write("\n");
      resolve(answer);
    });
  });
}

const username = (await ask("Identifiant : ")).trim();
const password = await ask("Mot de passe (saisie masquée) : ", { hidden: true });

if (!username || password.length < 8) {
  console.error("Identifiant requis et mot de passe d'au moins 8 caractères.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, COST);
// Encodé en base64 : les « $ » d'un hash bcrypt seraient interprétés par les fichiers .env.
const encoded = Buffer.from(hash, "utf8").toString("base64");

console.log(`
À ajouter dans .env.local (remplacer N par le prochain numéro libre) :

USER_N_ID=${username}
USER_N_HASH=${encoded}
USER_N_NAME=${username}
USER_N_ROLE=manager
`);
