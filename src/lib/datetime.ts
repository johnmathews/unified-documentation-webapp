/**
 * Shared date/time formatting.
 *
 * The backend returns full ISO 8601 timestamps (with time-of-day) for
 * created/modified. Display them with the time included — an edit at 10am
 * vs 10pm is meaningful. Single helper so all sites stay consistent and
 * don't drift back to date-only.
 */

/**
 * Format an ISO timestamp as "19 May 2026, 15:31" (en-GB, date + time).
 * Returns "" for null/empty input, and echoes the raw string if it can't
 * be parsed (defensive — matches prior per-site behaviour).
 */
export function formatDateTime(dateStr: string | null | undefined): string {
 if (!dateStr) return "";
 const d = new Date(dateStr);
 if (Number.isNaN(d.getTime())) return dateStr;
 return d.toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
 });
}
