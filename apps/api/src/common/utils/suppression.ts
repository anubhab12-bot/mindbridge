/**
 * Small-group suppression for aggregate metrics. Any non-zero count below the threshold is
 * replaced by null and flagged, so that rare categories (for example a crisis level in a small
 * region or week) cannot be used to single out individuals. Totals are suppressed the same way.
 */
export interface SuppressedCount {
  key: string;
  count: number | null;
  suppressed: boolean;
}

export function suppressCounts(rows: { _id: unknown; count: number }[], min: number): SuppressedCount[] {
  return rows
    .map((r) => {
      const small = r.count > 0 && r.count < min;
      return { key: String(r._id ?? 'unknown'), count: small ? null : r.count, suppressed: small };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function suppressOne(count: number, min: number): { count: number | null; suppressed: boolean } {
  const small = count > 0 && count < min;
  return { count: small ? null : count, suppressed: small };
}
