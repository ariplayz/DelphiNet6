/**
 * Week boundary helpers — the school week resets Tuesday 00:00.
 * Default semantics use UTC (matches Phase 9 behaviour). For TZ-aware boundaries
 * (Phase 10 cron / school-tz), use {@link getWeekStartInTimeZone}.
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

/**
 * Compute the most-recent Tuesday 00:00 wall-clock time for the given IANA
 * timezone, returned as a UTC Date instant. Used by the Phase 10 reset cron so
 * snapshots align with the school's local week.
 */
export function getWeekStartInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const weekdayShort = get('weekday'); // Sun, Mon, Tue, ...
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayShort] ?? 0;
  const daysSinceTue = (dayOfWeek - 2 + 7) % 7;

  // Local midnight on the most-recent Tuesday.
  const localMidnight = new Date(Date.UTC(year, month - 1, day - daysSinceTue, 0, 0, 0));
  // Find what UTC instant corresponds to that local-wall-clock midnight.
  return zonedWallClockToUtc(localMidnight, timeZone);
}

export function getNextWeekStartInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): Date {
  const cur = getWeekStartInTimeZone(timeZone, now);
  const next = new Date(cur);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

/**
 * Given a Date whose UTC fields represent the desired wall-clock time in
 * `timeZone`, return the actual UTC instant for that wall-clock time.
 */
function zonedWallClockToUtc(wallClockUtc: Date, timeZone: string): Date {
  // Walk towards a fixed-point: adjust the candidate UTC instant by the
  // observed offset until the formatted local time matches the target.
  let candidate = new Date(wallClockUtc.getTime());
  for (let i = 0; i < 3; i++) {
    const observed = formatZoned(candidate, timeZone);
    const observedAsUtc = Date.UTC(
      observed.year, observed.month - 1, observed.day,
      observed.hour, observed.minute, observed.second,
    );
    const diff = wallClockUtc.getTime() - observedAsUtc;
    if (diff === 0) break;
    candidate = new Date(candidate.getTime() + diff);
  }
  return candidate;
}

function formatZoned(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}
