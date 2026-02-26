/**
 * Cache utility with TTL and stale-while-revalidate support
 *
 * Provides efficient caching for API calls and expensive operations.
 * Supports stale-while-revalidate pattern for background refresh.
 */

import type { CacheEntry } from "../types.js";
import { debug } from "./logger.js";

/** Internal cache storage */
const cache = new Map<string, CacheEntry<unknown>>();

/** Default TTL in milliseconds (5 minutes) */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Check if a cache entry is stale (expired).
 */
function isStale(entry: CacheEntry<unknown>): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Create a cache entry.
 */
function createEntry<T>(value: T, ttl: number): CacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + ttl,
  };
}

/**
 * Get a value from cache
 *
 * Returns undefined if:
 * - Key doesn't exist
 * - Entry is stale and `allowStale` is false
 */
export function get<T>(key: string, allowStale = false): T | undefined {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (isStale(entry)) {
    if (allowStale) {
      debug(`Cache hit (stale): ${key}`);
      return entry.value as T;
    }
    // Delete stale entry
    cache.delete(key);
    debug(`Cache stale, deleted: ${key}`);
    return undefined;
  }

  debug(`Cache hit: ${key}`);
  return entry.value as T;
}

/**
 * Set a value in cache with TTL
 */
export function set<T>(key: string, value: T, ttl = DEFAULT_TTL): void {
  const entry = createEntry(value, ttl);
  cache.set(key, entry);
  debug(`Cache set: ${key} (TTL: ${ttl}ms)`);
}

/**
 * Get or compute a value using async factory
 *
 * Returns cached value if fresh, otherwise computes and caches.
 * For stale entries, returns stale value immediately and refreshes in background.
 *
 * @param key - Cache key
 * @param factory - Async function to compute value
 * @param ttl - Time to live in milliseconds
 * @param allowStale - Whether to return stale values during revalidation
 */
export async function getOrCompute<T>(
  key: string,
  factory: () => Promise<T>,
  ttl = DEFAULT_TTL,
  allowStale = true
): Promise<T> {
  const existing = get<T>(key, allowStale);

  if (existing) {
    const entry = cache.get(key);
    // If stale and we allowed stale value, trigger background refresh
    if (entry && isStale(entry) && allowStale) {
      debug(`Background refresh for stale key: ${key}`);
      factory().then((fresh) => {
        set(key, fresh, ttl);
      }).catch((err) => {
        debug(`Background refresh failed: ${key} - ${err}`);
      });
    }
    return existing;
  }

  // Compute and cache
  debug(`Cache miss, computing: ${key}`);
  const value = await factory();
  set(key, value, ttl);
  return value;
}

/**
 * Clear a specific cache entry
 */
export function clear(key: string): void {
  cache.delete(key);
  debug(`Cache cleared: ${key}`);
}

/**
 * Clear all cache entries
 */
export function clearAll(): void {
  const size = cache.size;
  cache.clear();
  debug(`Cache cleared all (${size} entries)`);
}

/**
 * Get cache statistics
 */
export function getStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * Clean up expired entries (manual garbage collection)
 *
 * Normally this is not needed as expired entries are removed on access.
 * Call this periodically to free memory if cache is large.
 */
export function cleanup(): number {
  let removed = 0;
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    debug(`Cache cleanup: removed ${removed} expired entries`);
  }

  return removed;
}
