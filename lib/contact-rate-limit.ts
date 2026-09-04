// Best-effort, per-Worker-instance throttling, not a distributed quota.
// No inquiry contents or durable IP records. Expired buckets are removed on use.
export function createContactRateLimiter({ limit = 5, windowMs = 60_000, maxEntries = 2048, now = Date.now } = {}) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return (key: string): number => {
    const time = now();
    for (const [id, bucket] of buckets) if (bucket.expires <= time) buckets.delete(id);
    const bucket = buckets.get(key);
    if (bucket) {
      if (bucket.count >= limit) return Math.max(1, Math.ceil((bucket.expires - time) / 1000));
      bucket.count++;
      return 0;
    }
    // Fail closed when the bounded table is full instead of evicting active limits.
    if (buckets.size >= maxEntries) return Math.ceil(windowMs / 1000);
    buckets.set(key, { count: 1, expires: time + windowMs });
    return 0;
  };
}

export const contactRateLimiter = createContactRateLimiter();
