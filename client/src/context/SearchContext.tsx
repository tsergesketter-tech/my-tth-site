import React, { createContext, useContext, useMemo, useState } from "react";

export type SearchState = {
  city?: string;
  checkIn?: string;   // ISO date
  checkOut?: string;  // ISO date
  guests?: number;
  nights: number;     // derived; defaults to 1
};

type Ctx = {
  search: SearchState;
  setSearch: (s: Partial<SearchState>) => void;
  computeNights: (checkIn?: string, checkOut?: string) => number;
};

const SearchContext = createContext<Ctx | null>(null);

function diffNights(ci?: string, co?: string) {
  if (!ci || !co) return 1;
  const start = new Date(ci);
  const end = new Date(co);
  const ms = Math.max(0, end.getTime() - start.getTime());
  const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, nights);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearchState] = useState<SearchState>({ nights: 1 });

  const value = useMemo<Ctx>(() => {
    return {
      search,
      setSearch(patch) {
        setSearchState((prev) => {
          const next: SearchState = { ...prev, ...patch };
          // keep nights in sync with dates (and never duplicate)
          const n = diffNights(next.checkIn, next.checkOut);
          next.nights = n;
          return next;
        });
      },
      computeNights: diffNights,
    };
  }, [search]);

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider>");
  return ctx;
}
