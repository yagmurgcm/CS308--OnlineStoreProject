"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import Toast from "../components/Toast";
import {
  type ProductRecord,
  searchProducts,
} from "@/lib/products";

export const SEARCH_DEBOUNCE_MS = 400;

type SearchExperienceProps = {
  initialQuery?: string;
  searchFn?: (term: string) => Promise<ProductRecord[]>;
  onNavigate?: (term: string) => void;
};

export function SearchExperience({
  initialQuery = "",
  searchFn = searchProducts,
  onNavigate,
}: SearchExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    initialQuery ? "loading" : "idle",
  );
  const [results, setResults] = useState<ProductRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<number>();
  const lastSearchedRef = useRef<string>("");

  const runSearch = useCallback(
    (term: string, options?: { immediate?: boolean }) => {
      setQuery(term);

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      const trimmed = term.trim();
      if (!trimmed) {
        setResults([]);
        setStatus("idle");
        lastSearchedRef.current = "";
        onNavigate?.("");
        return;
      }

      const execute = async () => {
        setStatus("loading");
        try {
          const data = await searchFn(trimmed);
          setResults(data);
          setStatus("success");
          lastSearchedRef.current = trimmed;
          onNavigate?.(trimmed);
        } catch (error) {
          setStatus("error");
          lastSearchedRef.current = trimmed;
          setToast(error instanceof Error ? error.message : "Search failed");
        }
      };

      if (options?.immediate) {
        void execute();
        return;
      }

      debounceRef.current = window.setTimeout(execute, SEARCH_DEBOUNCE_MS);
    },
    [onNavigate, searchFn],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery, { immediate: true });
    } else {
      setResults([]);
      setStatus("idle");
      lastSearchedRef.current = "";
    }
  }, [initialQuery, runSearch]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(query, { immediate: true });
  };

  const emptyStateMessage = query.trim()
    ? "No matches found for your search."
    : "Start typing to search the catalog.";

  return (
    <main className="bg-[var(--background)] min-h-screen">
      <section className="container-base py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Search
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Find what you are looking for
          </h1>
          <form
            onSubmit={handleSubmit}
            className="relative"
            aria-label="Search products"
          >
            <input
              value={query}
              onChange={(event) => runSearch(event.target.value)}
              placeholder="Search products, categories, colors..."
              className="w-full rounded-full border border-[var(--line)] bg-white px-4 py-3 pr-12 text-sm shadow-sm outline-none focus:ring-2 focus:ring-black/10"
              data-testid="search-input"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-black text-white transition hover:bg-neutral-800"
              aria-label="Run search"
            >
              🔍
            </button>
          </form>
          <div className="text-sm text-neutral-600" aria-live="polite">
            {status === "loading" && "Searching..."}
            {status === "success" && lastSearchedRef.current && (
              <>Showing {results.length} result(s) for “{lastSearchedRef.current}”.</>
            )}
            {status === "idle" && "Type to start searching."}
            {status === "error" && "Something went wrong while searching."}
          </div>
        </header>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
            <p className="text-lg font-medium text-neutral-900">No results</p>
            <p className="mt-2 text-sm text-neutral-600">{emptyStateMessage}</p>
          </div>
        ) : (
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="search-results-grid"
          >
            {results.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                title={product.name}
                price={product.price}
                img={product.image}
                averageRating={product.averageRating}
                reviewCount={product.reviewCount}
              />
            ))}
          </div>
        )}
      </section>

      {toast && (
        <Toast
          message={toast}
          type="error"
          onDismiss={() => setToast(null)}
        />
      )}
    </main>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const handleNavigate = (term: string) => {
    const path = term ? `/search?q=${encodeURIComponent(term)}` : "/search";
    router.replace(path);
  };

  return (
    <SearchExperience
      initialQuery={initialQuery}
      onNavigate={handleNavigate}
    />
  );
}
