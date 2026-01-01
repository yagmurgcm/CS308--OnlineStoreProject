"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Scope = "CATEGORY" | "SUBCATEGORY" | "PRODUCT";

type ProductRecord = {
  id: number;
  name: string;
  image?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price: number | string;
  discountRate?: number | null;
  discountedPrice?: number | string | null;
};

type ApplyDiscountResponse = {
  updatedCount: number;
  discountRate: number;
};

const CATEGORY_CANONICAL_LABELS: Record<string, string> = {
  women: "Women",
  men: "Men",
  beauty: "Beauty",
};

const normalizeCategoryLabel = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const canonical = CATEGORY_CANONICAL_LABELS[trimmed.toLowerCase()];
  return canonical ?? trimmed;
};

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const normalizePrice = (value: number | string | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const computeDiscountedPrice = (price: number, rate: number) => {
  if (rate <= 0) return price;
  return Number((price * (1 - rate / 100)).toFixed(2));
};

export default function DiscountsPage() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("CATEGORY");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [discountRate, setDiscountRate] = useState<number>(20);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/sign-in?redirect=/sales-manager/discounts");
      return;
    }
    if (user.role !== "SALES_MANAGER") {
      router.replace("/");
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (!initialized || !user || user.role !== "SALES_MANAGER") return;
    let cancelled = false;
    const loadProducts = async () => {
      setLoadingProducts(true);
      setLoadError(null);
      try {
        const response = await api.get<{ items: ProductRecord[] }>("/products?limit=500");
        if (!cancelled) {
          const normalizedItems =
            response?.items?.map((product) => ({
              ...product,
              category: normalizeCategoryLabel(product.category),
            })) ?? [];
          setProducts(normalizedItems);
        }
      } catch (error) {
        console.error("Failed to load products", error);
        if (!cancelled) {
          setLoadError("Unable to load products right now. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    const ordered: string[] = [];
    products.forEach((product) => {
      const label = normalizeCategoryLabel(product.category);
      if (!label) return;
      const key = label.toLowerCase();
      if (unique.has(key)) return;
      unique.add(key);
      ordered.push(label);
    });
    return ordered;
  }, [products]);

  useEffect(() => {
    if (!category && categories.length) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const availableSubcategories = useMemo(() => {
    if (!category) return [];
    const set = new Set<string>();
    products.forEach((product) => {
      if (
        product.category &&
        product.category.toLowerCase() === category.toLowerCase() &&
        product.subcategory
      ) {
        set.add(product.subcategory);
      }
    });
    return Array.from(set);
  }, [products, category]);

  useEffect(() => {
    if (scope !== "SUBCATEGORY") return;
    if (subcategory && availableSubcategories.includes(subcategory)) return;
    setSubcategory(availableSubcategories[0] ?? "");
  }, [scope, subcategory, availableSubcategories]);

  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    const normalizedCategory = category.toLowerCase();
    const normalizedSub = subcategory.toLowerCase();
    let list = products;
    if (scope === "CATEGORY" && category) {
      list = products.filter(
        (product) =>
          (product.category ?? "").toLowerCase() === normalizedCategory,
      );
    } else if (scope === "SUBCATEGORY" && category && subcategory) {
      list = products.filter(
        (product) =>
          (product.category ?? "").toLowerCase() === normalizedCategory &&
          (product.subcategory ?? "").toLowerCase() === normalizedSub,
      );
    } else if (scope === "PRODUCT") {
      const query = productSearch.trim().toLowerCase();
      list = query
        ? products.filter((product) => {
            const name = product.name?.toLowerCase() ?? "";
            return (
              name.includes(query) ||
              String(product.id).includes(query)
            );
          })
        : products;
    }
    return list.sort((a, b) => a.id - b.id);
  }, [products, scope, category, subcategory, productSearch]);

  const toggleProductSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((product) => selectedIds.has(product.id));

  const toggleVisibleSelection = () => {
    if (!filteredProducts.length) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (visibleAllSelected) {
        filteredProducts.forEach((product) => next.delete(product.id));
      } else {
        filteredProducts.forEach((product) => next.add(product.id));
      }
      return next;
    });
  };

  const handleApplyDiscount = async () => {
    setApplyError(null);
    setApplySuccess(null);
    if (!selectedIds.size) {
      setApplyError("Please select at least one product.");
      return;
    }
    if (discountRate < 0) {
      setApplyError("Discount rate must be zero or greater.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = await api.post<ApplyDiscountResponse>("/sales-manager/discounts", {
        productIds: Array.from(selectedIds),
        discountRate: Math.round(discountRate),
      });
      setApplySuccess(
        `Discount applied to ${payload?.updatedCount ?? selectedIds.size} product(s).`,
      );
      setProducts((prev) =>
        prev.map((product) => {
          if (!selectedIds.has(product.id)) return product;
          const basePrice = normalizePrice(product.price);
          return {
            ...product,
            discountRate: Math.round(discountRate),
            discountedPrice:
              discountRate > 0
                ? computeDiscountedPrice(basePrice, Math.round(discountRate))
                : null,
          };
        }),
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to apply discount", error);
      setApplyError(
        error instanceof Error ? error.message : "Failed to apply discount.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!initialized || !user || user.role !== "SALES_MANAGER") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Sales Manager</p>
          <h1 className="text-3xl font-semibold mt-2">Discount Management</h1>
          <p className="text-gray-600 mt-3">
            Choose a scope, select the relevant products, and apply a discount rate. Only the
            selected items will be updated.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/sales-manager")}
          className="inline-flex items-center rounded-full border border-[var(--line)] px-5 py-2 text-sm font-medium hover:border-black"
        >
          ← Back to dashboard
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/80 backdrop-blur p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          {(["CATEGORY", "SUBCATEGORY", "PRODUCT"] as Scope[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setScope(option)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                scope === option
                  ? "bg-black text-white border-black"
                  : "border-[var(--line)] text-gray-600 hover:border-black hover:text-black"
              }`}
            >
              {option.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(scope === "CATEGORY" || scope === "SUBCATEGORY") && (
            <label className="text-sm font-medium text-gray-700">
              Category
              <select
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSubcategory("");
                }}
              >
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === "SUBCATEGORY" && (
            <label className="text-sm font-medium text-gray-700">
              Subcategory
              <select
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
              >
                {availableSubcategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scope === "PRODUCT" && (
            <label className="text-sm font-medium text-gray-700 md:col-span-2 lg:col-span-1">
              Product search
              <input
                type="text"
                placeholder="Name or ID"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
              />
            </label>
          )}

          <label className="text-sm font-medium text-gray-700">
            Discount (%)
            <input
              type="number"
              min={0}
              max={90}
              value={discountRate}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) {
                  setDiscountRate(0);
                } else {
                  setDiscountRate(Math.min(Math.max(next, 0), 90));
                }
              }}
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Products</p>
            <p className="text-xs text-gray-500">
              {filteredProducts.length} result(s) • {selectedIds.size} selected
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={toggleVisibleSelection}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 hover:border-black"
            >
              {visibleAllSelected ? "Clear visible" : "Select visible"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 hover:border-black"
            >
              Clear all
            </button>
          </div>
        </div>

        {loadingProducts ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading products…</div>
        ) : loadError ? (
          <div className="py-12 text-center text-sm text-red-600">{loadError}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No products found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    <span className="sr-only">Select product</span>
                  </th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Original price</th>
                  <th className="px-4 py-3">Discounted price</th>
                  <th className="px-4 py-3">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] bg-white">
                {filteredProducts.map((product) => {
                  const numericPrice = normalizePrice(product.price);
                  const preview = selectedIds.has(product.id)
                    ? (discountRate > 0
                        ? computeDiscountedPrice(numericPrice, discountRate)
                        : numericPrice)
                    : product.discountedPrice != null
                      ? normalizePrice(product.discountedPrice as number | string)
                      : null;
                  return (
                    <tr key={product.id}>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex gap-3">
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
                            <Image
                              src={product.image || "/fallback.png"}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">ID #{product.id}</p>
                            <p className="text-xs text-gray-500">
                              {product.category}
                              {product.subcategory ? ` • ${product.subcategory}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top font-medium">
                        {priceFormatter.format(numericPrice)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {preview != null ? (
                          <div className="font-semibold text-[#146356]">
                            {priceFormatter.format(preview)}
                            {discountRate > 0 && selectedIds.has(product.id) && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({discountRate}% preview)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No discount</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-600">
                        Live price:{" "}
                        {priceFormatter.format(
                          product.discountedPrice != null
                            ? normalizePrice(product.discountedPrice as number | string)
                            : numericPrice,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(applyError || applySuccess) && (
          <div className="border-t border-[var(--line)] px-6 py-4">
            {applyError && (
              <p className="text-sm text-red-600" role="alert">
                {applyError}
              </p>
            )}
            {applySuccess && (
              <p className="text-sm text-green-600" role="status">
                {applySuccess}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
          <p className="text-sm text-gray-500">
            Discount rate applies equally to every selected product. Customers will immediately see
            the updated price.
          </p>
          <button
            type="button"
            onClick={handleApplyDiscount}
            className="inline-flex items-center rounded-full border border-black px-5 py-2 text-sm font-semibold hover:bg-black hover:text-white transition disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            disabled={submitting || selectedIds.size === 0}
          >
            {submitting ? "Applying…" : "Apply Discount"}
          </button>
        </div>
      </div>
    </div>
  );
}
