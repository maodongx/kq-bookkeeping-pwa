/**
 * Date helpers shared across the app.
 *
 * These used to be inlined in half a dozen places as
 *   new Date().toISOString().split("T")[0]
 * which is fine until you realize it returns the UTC date, not the
 * user's local date — so late-night entries could be recorded on the
 * "next day". Centralizing here lets us pick one convention and stick
 * with it.
 */

/**
 * Today's date as `YYYY-MM-DD`, in the user's local timezone.
 *
 * Use this for user-facing operations like "create a transaction dated
 * today" — users expect their local day, not UTC.
 */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/**
 * Today's date as `YYYY-MM-DD` in UTC.
 *
 * Use this for snapshots keyed on a date column (price snapshots,
 * exchange rate snapshots) so everyone — server, multiple clients,
 * cron — agrees on which day a row belongs to regardless of which
 * timezone the caller is in.
 */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today's date in `YYYYMMDD` form (no separators), in Asia/Tokyo.
 *
 * Specifically for the Yahoo Finance JP BFF API, which accepts dates
 * as compact strings in JST. Kept here so the Tokyo conversion is
 * documented in one place.
 */
export function todayTokyoCompact(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })
    .replace(/-/g, "");
}

/**
 * Local-time calendar boundaries for a given month. Returns the first
 * and last `YYYY-MM-DD` of the month, plus how many days it contains.
 * Using the local Date constructor (rather than UTC) means "May 2026"
 * is always May 1 through May 31 regardless of the user's offset —
 * avoids the off-by-one that plain `.toISOString()` would introduce
 * on late-month days when UTC has already rolled over.
 */
export function monthBoundariesLocal(
  year: number,
  monthIndex: number
): { startDate: string; endDate: string; daysInMonth: number } {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    daysInMonth: end.getDate(),
  };
}

/** Format a Date as `YYYY-MM-DD` using its local-time fields. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
