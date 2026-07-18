const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** "15m" / "30d" -> milliseconds. Deliberately minimal — only what JWT expiry strings need. */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string: ${duration}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
