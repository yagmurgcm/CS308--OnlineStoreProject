"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CategoryProductCard, {
  type CategoryProduct,
} from "./CategoryProductCard";
import { fetchProducts, getPalette, pickBadge } from "@/lib/products";

// TİP TANIMLARI
type PriceFilterOption = {
  value: string;
  label: string;
  min?: number;
  max?: number;
};

const PRICE_FILTERS: PriceFilterOption[] = [
  { value: "all", label: "All prices" },
  { value: "under-1000", label: "Under \u20BA1000", max: 1000 },
  { value: "1000-2000", label: "\u20BA1000 - \u20BA2000", min: 1000, max: 2000 },
  { value: "over-2000", label: "Over \u20BA2000", min: 2000 },
];

const SORT_OPTIONS = [
  {
    value: "recommended",
    label: "Recommended",
    compare: (a: DecoratedProduct, b: DecoratedProduct) =>
      a.originalIndex - b.originalIndex,
  },
  {
    value: "price-asc",
    label: "Price: Low to High",
    compare: (a: DecoratedProduct, b: DecoratedProduct) => a.price - b.price,
  },
  {
    value: "price-desc",
    label: "Price: High to Low",
    compare: (a: DecoratedProduct, b: DecoratedProduct) => b.price - a.price,
  },
  {
    value: "name-asc",
    label: "Name: A to Z",
    compare: (a: DecoratedProduct, b: DecoratedProduct) =>
      a.name.localeCompare(b.name),
  },
] as const;

type PriceFilterValue = string;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

type DecoratedProduct = CategoryProduct & {
  originalIndex: number;
  subcategory?: string | null;
};

export type CategoryListingPageProps = {
  categoryKey: string;
  label: string;
  heroTitle: string; // Bu varsayılan başlık (Coats & Jackets)
  heroSubtitle: string;
  subCategories: string[];
  defaultSubcategory?: string | null;
  limit?: number;
};

// YARDIMCI FONKSİYON: String temizleme
// "Shirts & Blouses" -> "shirtsblouses" yapar.
const normalize = (value?: string | null) => 
  value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";

export default function CategoryListingPage({
  categoryKey,
  label,
  heroTitle,
  heroSubtitle,
  subCategories,
  defaultSubcategory,
  limit = 100, // Limit arttırıldı
}: CategoryListingPageProps) {
  
  // Başlangıçta hiçbir şey seçili olmasın ki hepsi görünsün (İstersen değiştirebilirsin)
  const [activeSubcategory, setActiveSubcategory] =
    useState<string | null>(null);

  const [products, setProducts] = useState<DecoratedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [priceFilter, setPriceFilter] = useState<PriceFilterValue>("all");
  const [onlyNewIn, setOnlyNewIn] = useState(false);
  const [sortBy, setSortBy] = useState<SortValue>("recommended");
  
  // Popover state'leri
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  // Kategori değişirse (Header'dan Men/Women) seçimi sıfırla
  useEffect(() => {
    setActiveSubcategory(null);
  }, [categoryKey]);

  // VERİ ÇEKME (Debug Modu Açık)
// VERİ ÇEKME (Garantili Mod)
  // VERİ RÖNTGENİ MODU (Bunu yapıştır)
  // VERİ ÇEKME (STRICT MOD - Sadece Doğru Kategoriyi Getirir)
  // VERİ ÇEKME (STRICT MOD - KESİN KATEGORİ AYRIMI)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts();
        
        // URL'den gelen kategori (men, women, beauty)
        const currentCategory = categoryKey.toLowerCase().trim();

        console.log(`--- FİLTRE BAŞLADI: ${currentCategory} ---`);

        // 1. ADIM: SADECE SEÇİLİ KATEGORİYİ AL (Affetmek yok)
        const scoped = data.filter((item) => {
          // Backend'den gelen kategori ismini güvenli hale getir
          let itemCat = "";
          
          if (typeof item.category === 'string') {
             itemCat = item.category;
          } else if (item.category && typeof item.category === 'object' && (item.category as any).name) {
             itemCat = (item.category as any).name; 
          } else {
             itemCat = String(item.category || ""); 
          }

          // Eşleştirme (Büyük küçük harf duyarsız)
          return itemCat.toLowerCase().trim() === currentCategory;
        });

        console.log(`Backend Toplam: ${data.length} -> Kalan: ${scoped.length}`);

        // 🚨 ESKİ HATALI KOD BURADAYDI (scoped.length > 0 ? scoped : data) SİLDİK.
        // Artık sadece 'scoped' kullanıyoruz. Bulamazsa 0 ürün gösterir ama yanlış göstermez.
        const source = scoped; 
        
        const mapped = source.slice(0, limit).map((item, index) => {
           const imageUrl = item.image ? item.image : "https://placehold.co/400x600?text=No+Image";

          return {
            id: `prod-${item.id}`,
            productId: item.id,
            name: item.name,
            price: item.price,
            image: imageUrl,
            colors: getPalette(item.id),
            badge: pickBadge(index),
            subcategory: item.subcategory, // Veritabanındaki gerçek subcategory
            originalIndex: index,
          };
        });
        
        setProducts(mapped);
      } catch (err) {
        console.error("HATA:", err);
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryKey, limit]);

  // Popover dışına tıklayınca kapatma
  useEffect(() => {
    if (!filterOpen && !sortOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterOpen && filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen, sortOpen]);

  // FİLTRELEME MANTIĞI (SORUNUN ÇÖZÜLDÜĞÜ YER)
  // GÖRÜNÜR ÜRÜNLERİ FİLTRELEME (visibleProducts)
  const visibleProducts = useMemo(() => {
    let subset = [...products];

    // 1. Subcategory Filtresi
    if (activeSubcategory) {
      
      // 🚀 YENİ EKLENEN KISIM: "View All" seçiliyse filtreleme YAPMA (Hepsini göster)
      if (activeSubcategory === "View All" || activeSubcategory === "All") {
         // Hiçbir şey yapma, subset olduğu gibi kalsın.
      } 
      else {
        // Normal filtreleme mantığı (Coats, Shirts vs. seçiliyse)
        const targetKeywords = activeSubcategory.toLowerCase().split(/[^a-z]+/);
        
        subset = subset.filter((product) => {
            const prodSub = product.subcategory ? product.subcategory.toLowerCase() : "";
            
            // Eğer veritabanındaki subcategory ile buton ismi birebir tutuyorsa (Örn: "Coats & Jackets")
            if (prodSub === activeSubcategory.toLowerCase()) return true;

            // Tutmuyorsa kelime bazlı ara (Fail-safe)
            const prodName = product.name.toLowerCase();
            const isMatch = targetKeywords.some(keyword => 
               (keyword.length > 2) && (prodSub.includes(keyword) || prodName.includes(keyword))
            );
            return isMatch;
        });
      }
    }

    // 2. Fiyat Filtresi
    const priceRule =
      PRICE_FILTERS.find((rule) => rule.value === priceFilter) ??
      PRICE_FILTERS[0];

    subset = subset.filter((product) => {
      if (priceRule.min !== undefined && product.price < priceRule.min) return false;
      if (priceRule.max !== undefined && product.price > priceRule.max) return false;
      if (onlyNewIn && product.badge?.toLowerCase() !== "new in") return false;
      return true;
    });

    // 3. Sıralama
    const sortRule =
      SORT_OPTIONS.find((rule) => rule.value === sortBy) ?? SORT_OPTIONS[0];

    return subset.sort(sortRule.compare);
  }, [products, activeSubcategory, priceFilter, onlyNewIn, sortBy]);

  const totalItems = loading ? "Loading..." : `${visibleProducts.length} items`;
  
  // DİNAMİK BAŞLIK BELİRLEME
  // Eğer alt kategori seçiliyse onu yaz, yoksa varsayılan başlığı yaz.
  const displayTitle = activeSubcategory ? activeSubcategory : heroTitle;

  // Filter & Sort Labels
  const activeFilterCount = (priceFilter !== "all" ? 1 : 0) + (onlyNewIn ? 1 : 0);
  const filterLabel = activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter";
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? "Sort by";

  const renderPopover = (content: ReactNode) => (
    <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-2xl">
      {content}
    </div>
  );

  const resetFilters = () => {
    setPriceFilter("all");
    setOnlyNewIn(false);
  };

  return (
    <main className="container-base space-y-10 py-12">
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            {label}
          </p>
          
          {/* İŞTE BAŞLIĞI DÜZELTEN KOD BURASI */}
          <h1 className="text-3xl font-semibold tracking-tight">
            {displayTitle}
          </h1>
          
          <p className="text-sm text-neutral-600">{heroSubtitle}</p>
        </div>

        {/* Kategori Butonları */}
        <nav className="flex flex-wrap gap-4 border-b border-[var(--line)] pb-3 text-sm">
          {subCategories.map((category) => {
            const isActive = activeSubcategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() =>
                  // Tıklayınca state değişiyor, tekrar tıklarsan filtre kalkıyor
                  setActiveSubcategory((prev) =>
                    prev === category ? null : category,
                  )
                }
                className={`pb-1 transition ${
                  isActive
                    ? "border-b-2 border-[#7a0025] font-semibold text-[#7a0025]"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                aria-pressed={isActive}
              >
                {category}
              </button>
            );
          })}
        </nav>
      </section>

      {/* Filtre Butonları (Filter & Sort) */}
      <section className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-600">
        <span className="text-neutral-500">{totalItems}</span>
        <div className="flex gap-2">
            {/* Filter Dropdown */}
            <div className="relative" ref={filterRef}>
            <button
              type="button"
              className="btn h-10 px-5"
              onClick={() => {
                setFilterOpen((prev) => !prev);
                setSortOpen(false);
              }}
            >
              {filterLabel}
            </button>
            {filterOpen &&
              renderPopover(
                <div className="space-y-4">
                   {/* Fiyat Filtreleri */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Price range
                    </p>
                    <div className="mt-2 space-y-1">
                      {PRICE_FILTERS.map((rule) => (
                        <label
                          key={rule.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50"
                        >
                          <input
                            type="radio"
                            className="accent-[#7a0025]"
                            name="price-filter"
                            value={rule.value}
                            checked={priceFilter === rule.value}
                            onChange={() => setPriceFilter(rule.value)}
                          />
                          {rule.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* New Arrivals Checkbox */}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      className="accent-[#7a0025]"
                      checked={onlyNewIn}
                      onChange={(event) => setOnlyNewIn(event.target.checked)}
                    />
                    New arrivals only
                  </label>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      className="text-sm font-medium text-neutral-500 underline underline-offset-4"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary px-4 py-1.5 text-sm"
                      onClick={() => setFilterOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                </div>,
              )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              className="btn h-10 px-5"
              onClick={() => {
                setSortOpen((prev) => !prev);
                setFilterOpen(false);
              }}
            >
              {sortOpen ? "Close" : sortLabel}
            </button>
            {sortOpen &&
              renderPopover(
                <div className="space-y-2 text-sm">
                  {SORT_OPTIONS.map((option) => {
                    const isActive = sortBy === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-full rounded-lg px-3 py-2 text-left ${
                          isActive
                            ? "bg-[#7a0025] text-white"
                            : "hover:bg-neutral-50"
                        }`}
                        onClick={() => {
                          setSortBy(option.value);
                          setSortOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>,
              )}
          </div>
        </div>
      </section>

      {/* ÜRÜN LİSTESİ */}
      <section>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading products...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : visibleProducts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-500">
             {/* Ürün bulunamazsa kullanıcıya ne aradığımızı gösteriyoruz */}
              No products found for <span className="font-bold">"{displayTitle}"</span>.
            </p>
            <button 
                onClick={() => setActiveSubcategory(null)}
                className="mt-2 text-[#7a0025] underline text-sm"
            >
                Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <CategoryProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}