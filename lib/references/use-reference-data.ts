"use client";

import { useEffect, useRef, useState } from "react";
import type { ListValuesResponse, ReferenceRow } from "./types";

/**
 * Process-local cache shared across components on the same page. Keyed by
 * `${master}|${search}|${includeInactive}|${company}|${limit}`. Entries
 * expire after CACHE_TTL_MS so admin edits eventually propagate.
 *
 * We deliberately don't pull in SWR/react-query — one hook with a small
 * cache is enough for dropdown loads, and keeps the bundle slim. If we
 * ever need request dedup / revalidation-on-focus, swap this for SWR.
 */
const CACHE_TTL_MS = 30_000;

type CacheEntry = { fetchedAt: number; data: ListValuesResponse };
const cache = new Map<string, CacheEntry>();
/** In-flight requests keyed the same way as the cache, so concurrent
 *  consumers share a single fetch. */
const inflight = new Map<string, Promise<ListValuesResponse>>();

export type UseReferenceDataOptions = {
  search?: string;
  includeInactive?: boolean;
  company?: string;
  limit?: number;
  /** Skip fetching (useful for disabled/uncontrolled forms). */
  enabled?: boolean;
};

export type UseReferenceDataResult = {
  rows: ReferenceRow[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/**
 * Fetch reference-master rows for a given master. Returns rows + loading
 * state for use in client components.
 *
 *   const { rows, loading } = useReferenceData("Lead Source");
 *
 *   const { rows, loading } = useReferenceData("Department", {
 *     search: query,
 *     includeInactive: showArchived,
 *   });
 */
export function useReferenceData(
  master: string,
  opts: UseReferenceDataOptions = {},
): UseReferenceDataResult {
  const {
    search = "",
    includeInactive = false,
    company = "",
    limit = 50,
    enabled = true,
  } = opts;
  const cacheKey = `${master}|${search}|${includeInactive ? 1 : 0}|${company}|${limit}`;
  const [data, setData] = useState<ListValuesResponse | null>(() => {
    const c = cache.get(cacheKey);
    return c && Date.now() - c.fetchedAt < CACHE_TTL_MS ? c.data : null;
  });
  const [loading, setLoading] = useState<boolean>(enabled && !data);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    if (!enabled || !master) {
      setLoading(false);
      return;
    }
    // Cache hit
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Coalesce concurrent loads
    let p = inflight.get(cacheKey);
    if (!p) {
      const url = new URL(
        `/api/references/${encodeURIComponent(master)}`,
        window.location.origin,
      );
      if (search) url.searchParams.set("search", search);
      if (includeInactive) url.searchParams.set("include_inactive", "1");
      if (company) url.searchParams.set("company", company);
      url.searchParams.set("limit", String(limit));
      p = fetch(url.toString(), { credentials: "same-origin" })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error ?? `Request failed (${res.status}).`);
          }
          return res.json() as Promise<ListValuesResponse>;
        })
        .then((j) => {
          cache.set(cacheKey, { fetchedAt: Date.now(), data: j });
          return j;
        })
        .finally(() => {
          inflight.delete(cacheKey);
        });
      inflight.set(cacheKey, p);
    }
    p.then((j) => {
      if (aborted.current) return;
      setData(j);
      setLoading(false);
    }).catch((err: unknown) => {
      if (aborted.current) return;
      setError(err instanceof Error ? err.message : "Request failed.");
      setLoading(false);
    });
    return () => {
      aborted.current = true;
    };
  }, [master, cacheKey, enabled, search, includeInactive, company, limit, tick]);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refresh: () => {
      cache.delete(cacheKey);
      setTick((n) => n + 1);
    },
  };
}

/**
 * Drop a master's cache entries — call from admin pages after upsert /
 * deactivate so the next render re-fetches.
 */
export function invalidateReferenceData(master: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(`${master}|`)) cache.delete(k);
  }
}
