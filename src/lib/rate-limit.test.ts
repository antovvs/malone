import assert from "node:assert/strict";
import { test } from "node:test";

import { createRateLimiter, LOGIN_LIMITS } from "./rate-limit.ts";

const IP = "203.0.113.7";
const T0 = 1_000_000;

test("autorise 5 tentatives par minute, refuse la 6e", () => {
  const limiter = createRateLimiter();
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(limiter.check(IP, T0 + i * 1000), { allowed: true });
  }
  const verdict = limiter.check(IP, T0 + 5000);
  assert.equal(verdict.allowed, false);
  assert.equal(!verdict.allowed && verdict.reason, "too_fast");
});

test("la fenêtre d'une minute glisse : on peut réessayer ensuite", () => {
  const limiter = createRateLimiter();
  for (let i = 0; i < 5; i++) limiter.check(IP, T0);
  assert.equal(limiter.check(IP, T0 + 30_000).allowed, false);
  assert.equal(limiter.check(IP, T0 + LOGIN_LIMITS.windowMs + 1).allowed, true);
});

test("5 échecs bloquent l'IP pendant 15 minutes", () => {
  const limiter = createRateLimiter();
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.check(IP, T0 + i).allowed, true);
    limiter.recordFailure(IP, T0 + i);
  }
  // Même une minute plus tard (débit redevenu correct), l'IP reste bloquée.
  const during = limiter.check(IP, T0 + 2 * 60_000);
  assert.equal(during.allowed, false);
  assert.equal(!during.allowed && during.reason, "blocked");
  // Juste avant la fin du blocage : toujours refusé. Juste après : autorisé.
  assert.equal(limiter.check(IP, T0 + LOGIN_LIMITS.blockMs - 1000).allowed, false);
  assert.equal(limiter.check(IP, T0 + LOGIN_LIMITS.blockMs + 1000).allowed, true);
});

test("une connexion réussie remet les échecs à zéro", () => {
  const limiter = createRateLimiter();
  for (let i = 0; i < 4; i++) {
    limiter.check(IP, T0 + i);
    limiter.recordFailure(IP, T0 + i);
  }
  limiter.check(IP, T0 + 10);
  limiter.recordSuccess(IP);
  // 4 nouveaux échecs ne suffisent pas à bloquer : le compteur est reparti de zéro.
  const later = T0 + 5 * 60_000;
  for (let i = 0; i < 4; i++) {
    limiter.check(IP, later + i);
    limiter.recordFailure(IP, later + i);
  }
  assert.equal(limiter.check(IP, later + 100).allowed, true);
});

test("les IP sont indépendantes", () => {
  const limiter = createRateLimiter();
  for (let i = 0; i < 5; i++) {
    limiter.check(IP, T0);
    limiter.recordFailure(IP, T0);
  }
  assert.equal(limiter.check(IP, T0 + 1).allowed, false);
  assert.equal(limiter.check("198.51.100.2", T0 + 1).allowed, true);
});
