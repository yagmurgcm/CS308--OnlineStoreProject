"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Toast from "../components/Toast";
import { fetchProducts, type ProductSort } from "@/lib/products";
import { CART_AUTH_ERROR, useCart } from "@/lib/cart-context";

type Product = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
};

const fmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export function SortSelect({
  value,
  onChange,
}: {
  value: ProductSort | "";
  onChange: (val: ProductSort | "") => void;
}) {
  return (
    <select
      className="select select-bordered select-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ProductSort | "")}
      aria-label="Sort products"
      data-testid="sort-select"
    >
      <option value="">Sort</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="popularity">Popularity</option>
      <option value="rating">Rating</option>
    </select>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProductSort | "">("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      setActionError("");
      try {
        const data = await fetchProducts({
          search: search.trim() || undefined,
          sort: sort || undefined,
          limit: 100,
        });
        setProducts(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search, sort]);

  async function addToCart(productId: number) {
    const product = products.find((p) => p.id === productId);
    try {
      setActionError("");
      setAddingId(productId);
      await addItem({ productId, quantity: 1 });
      setToastMessage(product ? `Added ${product.name} to cart` : "Added to cart");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add to cart";
      if (message === CART_AUTH_ERROR) {
        router.push("/sign-in");
        return;
      }
      setActionError(message);
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <main className="container-base py-10">
        <p className="text-sm text-neutral-600">Loading products...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container-base py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }

  return (
    <main className="bg-[var(--background)] min-h-screen">
      <section className="container-base py-10 space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Catalog
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-neutral-600">
              Browse everything in one place. Add items to your cart without leaving the grid.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-2 shadow-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-48 bg-transparent text-sm outline-none"
                aria-label="Search products"
              />
            </div>
            <SortSelect value={sort} onChange={(v) => setSort(v)} />
            <Link href="/cart" className="btn btn-primary">
              Go to cart
            </Link>
          </div>
        </header>

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
            <p className="text-lg font-medium text-neutral-900">No products found</p>
            <p className="mt-2 text-sm text-neutral-600">
              Try refreshing or checking back later.
            </p>
          </div>
        ) : (
          <>
            {actionError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {actionError}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => {
                const price =
                  typeof p.price === "string" ? parseFloat(p.price) : p.price || 0;
                const image = p.image || p.imageUrl || "/images/1.jpg";
                const description =
                  (p.description || "").length > 110
                    ? `${(p.description || "").slice(0, 107)}...`
                    : p.description || "";

                return (
                  <article
                    key={p.id}
                    className="group flex h-full flex-col rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <Link
                      href={`/products/${p.id}`}
                      className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]"
                    >
                      <Image
                        src={image}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </Link>

                    <div className="mt-3 flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/products/${p.id}`}
                          className="text-sm font-medium leading-tight text-neutral-900 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="text-sm font-semibold text-neutral-900">
                          {fmt.format(price)}
                        </span>
                      </div>

                      {description && (
                        <p className="text-xs text-neutral-500">{description}</p>
                      )}

                      <button
                        className="btn btn-primary mt-auto w-full"
                        onClick={() => addToCart(p.id)}
                        disabled={addingId === p.id}
                        aria-live="polite"
                      >
                        {addingId === p.id ? "Adding..." : "Add to cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </main>
  );
}
