/** Returns today's date plus `offsetDays` as an ISO 8601 date string (yyyy-MM-dd). */
export function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Converts a date-only string to the start-of-day ISO timestamp for inclusive range filters. */
export function startOfDayIso(date: string): string | undefined {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}

/** Converts a date-only string to the end-of-day ISO timestamp for inclusive range filters. */
export function endOfDayIso(date: string): string | undefined {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
}
