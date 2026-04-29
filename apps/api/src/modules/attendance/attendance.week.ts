/**
 * Week boundary helpers — the school week resets Tuesday 00:00 UTC.
 * (TZ refinement happens in Phase 10 with the actual reset job.)
 */
export function getCurrentWeekStart(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const daysSinceTue = (day - 2 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceTue);
  return d;
}

export function getNextWeekStart(now: Date = new Date()): Date {
  const cur = getCurrentWeekStart(now);
  const next = new Date(cur);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}
