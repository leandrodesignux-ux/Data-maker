/** Fixed UTC clock: every seed produces the same 180 calendar days. */
export const SIMULATED_TODAY = "2026-09-30";
export const HISTORY_DAYS = 180;

export function dayAt(index: number): string {
  const date = new Date(`${SIMULATED_TODAY}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (HISTORY_DAYS - 1 - index));
  return date.toISOString().slice(0, 10);
}

export const FIRST_DAY = dayAt(0);

export function dayIndex(isoDate: string): number {
  return Math.round((Date.parse(`${isoDate.slice(0, 10)}T12:00:00.000Z`) - Date.parse(`${FIRST_DAY}T12:00:00.000Z`)) / 86_400_000);
}
