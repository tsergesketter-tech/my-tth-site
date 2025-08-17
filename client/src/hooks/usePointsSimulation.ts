import { useEffect, useMemo, useRef, useState } from 'react';
import { simulatePoints, StayForSim } from '../utils/loyaltySim';

type CacheVal = { byCurrency: Record<string, number>; ts: number };

// 🔁 global cache shared by all components (lives for the page lifetime)
const GLOBAL_CACHE: Map<string, CacheVal> =
  (globalThis as any).__simCache || ((globalThis as any).__simCache = new Map());

export function usePointsSimulation(params: {
  stays: StayForSim[];
  program: string;
  membershipNumber: string;
  maxBatch?: number;
  ttlMs?: number;
}) {
  const { stays, program, membershipNumber, maxBatch = 8, ttlMs = 30 * 60 * 1000 } = params;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // include all fields that affect points
  const staysKey = useMemo(
    () =>
      JSON.stringify(
        stays.slice(0, maxBatch).map(s => [
          s.stayId, s.checkInISO, s.checkOutISO, s.nightlyRate, s.currency, s.nights,
          s.ratePlan ?? '', s.promoCode ?? '', s.brand ?? ''
        ])
      ),
    [stays, maxBatch]
  );

  // figure out which items we need to fetch (respect TTL)
  const toFetch = useMemo(() => {
    const now = Date.now();
    const miss: StayForSim[] = [];
    for (const s of stays.slice(0, maxBatch)) {
      const key = keyFor(s, program, membershipNumber);
      const hit = GLOBAL_CACHE.get(key);
      if (!hit || now - hit.ts > ttlMs) miss.push(s);
    }
    return miss;
  }, [staysKey, program, membershipNumber, ttlMs, maxBatch]);

  useEffect(() => {
    let alive = true;
    if (toFetch.length === 0) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { results } = await simulatePoints({ stays: toFetch, program, membershipNumber });

        if (!alive) return;
        results.forEach((r, i) => {
          const s = toFetch[i];
          const key = keyFor(s, program, membershipNumber);
          GLOBAL_CACHE.set(key, { byCurrency: r.byCurrency, ts: Date.now() });
        });
      } catch (e: any) {
        if (alive) setError(e.message || 'Failed to simulate');
      } finally {
        alive && setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [toFetch, program, membershipNumber]);

  function getEstimate(s: StayForSim) {
    const key = keyFor(s, program, membershipNumber);
    return GLOBAL_CACHE.get(key)?.byCurrency ?? null;
  }

  return { loading, error, getEstimate };
}

function keyFor(s: StayForSim, program: string, membershipNumber: string) {
  return [
    s.stayId, program, membershipNumber, s.checkInISO, s.checkOutISO,
    s.nightlyRate, s.currency, s.nights, s.ratePlan ?? '', s.promoCode ?? '', s.brand ?? ''
  ].join('|');
}


