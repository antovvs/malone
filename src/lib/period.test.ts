import assert from "node:assert/strict";
import { test } from "node:test";

import { daysInRange, previousPeriod, resolvePeriod, trendRange } from "./period.ts";

const TODAY = "2026-11-14";

test("préréglages de période", () => {
  assert.deepEqual(resolvePeriod("today", TODAY), { from: TODAY, to: TODAY });
  assert.deepEqual(resolvePeriod("7d", TODAY), { from: "2026-11-08", to: TODAY });
  assert.deepEqual(resolvePeriod("30d", TODAY), { from: "2026-10-16", to: TODAY });
  assert.deepEqual(resolvePeriod("month", TODAY), { from: "2026-11-01", to: TODAY });
  assert.deepEqual(resolvePeriod("last_month", TODAY), { from: "2026-10-01", to: "2026-10-31" });
});

test("mois dernier en janvier : décembre de l'année d'avant", () => {
  assert.deepEqual(resolvePeriod("last_month", "2027-01-05"), { from: "2026-12-01", to: "2026-12-31" });
});

test("la période précédente a la même durée, juste avant", () => {
  const range = { from: "2026-11-08", to: "2026-11-14" };
  const previous = previousPeriod(range);
  assert.deepEqual(previous, { from: "2026-11-01", to: "2026-11-07" });
  assert.equal(daysInRange(previous), daysInRange(range));
});

test("une plage personnalisée ne dépasse ni aujourd'hui ni 366 jours", () => {
  const future = resolvePeriod("custom", TODAY, { from: "2026-11-01", to: "2026-12-25" });
  assert.equal(future.to, TODAY);
  const long = resolvePeriod("custom", TODAY, { from: "2020-01-01", to: TODAY });
  assert.equal(daysInRange(long), 366);
});

test("la fenêtre de tendance fait au moins 30 jours et finit avec la période", () => {
  assert.deepEqual(trendRange({ from: TODAY, to: TODAY }), { from: "2026-10-16", to: TODAY });
  const long = { from: "2026-08-01", to: TODAY };
  assert.deepEqual(trendRange(long), long);
});
