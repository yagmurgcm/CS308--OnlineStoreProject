"use client";

import { useEffect, useState } from "react";
import CategoryProductCard, {
  CategoryProduct,
} from "../components/CategoryProductCard";
import { fetchProducts, getPalette, pickBadge } from "@/lib/products";

const SUB_CATEGORIES = [
  "Coats & Jackets",
  "Hoodies & Sweatshirts",
  "Jumpers & Cardigans",
  "Trousers & Shorts",
  "Shirts",
  "Tops & T-Shirts",
  "Polo Shirts",
  "Pyjamas & Loungewear",
];

export default function MenCategoryPage() {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts();
        const filtered = data.filter(
          (item) => item.category?.toLowerCase() === "men",
        );
        setProducts(
          filtered.slice(0, 12).map((item, index) => ({
            id: `men-${item.id}`,
            productId: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            colors: getPalette(item.id),
            badge: pickBadge(index),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalItems = products.length;

  return (
    <main className="container-base space-y-10 py-12">
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Men
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Coats & Jackets
          </h1>
          <p className="text-sm text-neutral-600">
            Weather-ready layers designed with MUJI simplicity.
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 border-b border-[var(--line)] pb-3 text-sm">
          {SUB_CATEGORIES.map((category, index) => {
            const isActive = index === 0;
            return (
              <span
                key={category}
                className={`pb-1 ${
                  isActive
                    ? "border-b-2 border-[#7a0025] font-semibold text-[#7a0025]"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {category}
              </span>
            );
          })}
        </nav>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-600">
        <span className="text-neutral-500">
          {loading ? "Loading..." : `${totalItems} items`}
        </span>
        <div className="flex gap-2">
          <button className="btn h-10 px-5">Filter</button>
          <button className="btn h-10 px-5">Sort by</button>
        </div>
      </section>

      <section>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <CategoryProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

