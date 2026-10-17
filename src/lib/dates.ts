export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO timestamp n days before now, at the given UTC hour. */
export function daysAgo(n: number, hour = 9): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function daysFromNow(n: number): string {
  return daysAgo(-n);
}

/** Whole days from `from` until `to` (negative when `to` is in the past). */
export function daysUntil(to: string, from: Date = new Date()): number {
  return Math.ceil((new Date(to).getTime() - from.getTime()) / 86_400_000);
}
