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

/**
 * Date `n` days before today, as `YYYY-MM-DD` in the user's local
 * timezone. Use for "last N days" range queries and for relative-date
 * comparisons (e.g. "is this transaction from yesterday?"). Comparing
 * against UTC-normalized dates when the stored dates are local is a
 * subtle off-by-one around midnight that this helper avoids.
 */
export function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalDate(d);
}

/**
 * Human-friendly "how long ago" label for a `YYYY-MM-DD` date, relative
 * to today in the user's local timezone. Used for the per-asset "last
 * transaction" marker so the user can scan which positions they've
 * touched recently.
 *
 * Returns "今天" / "昨天" / "N天前" for the last week, then falls back to
 * the plain `YYYY-MM-DD` for older dates (a relative count stops being
 * useful once it's "37天前"). Future dates (possible if a user backdates
 * forward) just show the date. Returns "" for empty/invalid input.
 */
export function relativeDayLabel(date: string): string {
  if (!date) return "";
  const then = new Date(`${date}T00:00:00`);
  if (Number.isNaN(then.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (today.getTime() - then.getTime()) / 86_400_000
  );
  if (diffDays < 0) return date;
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays <= 6) return `${diffDays}天前`;
  return date;
}

/** Format a Date as `YYYY-MM-DD` using its local-time fields. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
