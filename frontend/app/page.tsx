"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Hero from "./components/Hero";
import Scroller from "./components/Scroller";
import ProductCard from "./components/ProductCard";
import { fetchProducts } from "@/lib/products";

// --- SABİT DATA ---
const featured = [
  { title: "Women's Coats", img: "/images/1.jpg", url: "/women/coats" },
  { title: "Men's Knitwear", img: "/images/2.jpg", url: "/men/knitwear" },
  { title: "Home Fragrance", img: "/images/3.jpg", url: "/home/fragrance" },
  { title: "Storage Essentials", img: "/images/4.jpg", url: "/home/storage" },
  { title: "Beauty Picks", img: "/images/5.jpg", url: "/beauty" },
  { title: "Desk Refresh", img: "/images/d1.jpg", url: "/home/desk" },
  { title: "Travel Organisers", img: "/images/d2.jpg", url: "/travel" },
  { title: "Soft Bedding", img: "/images/d3.png", url: "/home/bedding" },
  { title: "Minimal Decor", img: "/images/d4.jpg", url: "/home/decor" },
];

const explore = [
  { title: "Towels & Bathrobes", img: "/images/6.jpg" },
  { title: "Shelving Units", img: "/images/4.jpg" },
  { title: "Travel", img: "/images/d2.jpg" },
  { title: "Stationery", img: "/images/d1.jpg" },
  { title: "Essential Pantry", img: "/images/1.jpg" },
];

const stories = [
  {
    title: "Autumn in Japan: Season of Quiet",
    cta: "Read the story",
    img: "/images/sonbahar.jpg",
    url: "https://www.japan-guide.com/e/e2273.html",  // Working Autumn foliage in Japan guide
  },
  {
    title: "Inside the Atelier: Crafting Linen",
    cta: "Discover the process",
    img: "/images/d3.png",
    url: "https://steamerystockholm.com/everything-you-need-to-know-linen",  // Linen care guide
  },
  {
    title: "Everyday Storage Tips",
    cta: "Get the guide",
    img: "/images/d4.jpg",
    url: "https://www.theessentialman.com/blog/mens-style-beginners",  // Men's style beginners blog
  },
  {
    title: "Daily Rituals: Calm Mornings",
    cta: "Explore routines",
    img: "/images/d5.jpg",
    url: "https://www.truehealthcorner.com/self-care-morning-routine",  // Updated to self-care morning routine guide
  },
];

type SectionProduct = {
  productId: number;
  title: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  img: string;
  averageRating?: number | string;
  reviewCount?: number;
};

export default function HomePage() {
  const [newArrivals, setNewArrivals] = useState<SectionProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<SectionProduct[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const data = await fetchProducts();
        
        // 🔥 TEMİZ VERSİYON: Hile yok, direkt backend verisi!
        const mapped = data.map((item: any) => ({
          productId: item.id,
          title: item.name,
          price: item.price,
          originalPrice: item.originalPrice,
          hasDiscount: item.hasDiscount,
          img: item.image,
          averageRating: item.averageRating, // Gerçek veri
          reviewCount: item.reviewCount,     // Gerçek veri
        }));

        setNewArrivals(mapped.slice(0, 8));
        const best = mapped.slice(8, 16);
        setBestSellers(best.length ? best : mapped.slice(0, 8));
      } catch (err) {
        setCatalogError(
          err instanceof Error ? err.message : "Failed to load catalog",
        );
      } finally {
        setCatalogLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <Hero />

      <div className="container-base space-y-14 md:space-y-16">
        {/* Featured this week */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">Featured this week</h2>
            <Link href="/categories" className="underline underline-offset-4 text-sm">
              See all
            </Link>
          </div>
          <Scroller>
            {featured.map((item, i) => (
              <Link
                key={i}
                href={item.url}
                className="flex-none rounded-lg border border-[var(--line)] bg-white w-[280px] lg:w-[320px] p-4 snap-start"
              >
                <div
                  className="aspect-[4/3] rounded-md bg-cover bg-center mb-3 border border-[var(--line)]"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="font-medium">{item.title}</div>
              </Link>
            ))}
          </Scroller>
        </section>

        {/* New Arrivals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">New Arrivals</h2>
            <div className="flex gap-2">
              <button className="pill">Women</button>
              <button className="pill">Men</button>
              <button className="pill">Home</button>
            </div>
          </div>
          {catalogError ? (
            <p className="text-sm text-red-600">{catalogError}</p>
          ) : catalogLoading ? (
            <p className="text-sm text-neutral-500">Loading products...</p>
          ) : (
            <Scroller>
              {newArrivals.map((item) => (
                <ProductCard
                  key={item.productId}
                  productId={item.productId}
                  title={item.title}
                  price={item.price}
                  originalPrice={item.originalPrice}
                  hasDiscount={item.hasDiscount}
                  img={item.img}
                  averageRating={item.averageRating}
                  reviewCount={item.reviewCount}
                  className="w-[260px] lg:w-[300px]"
                />
              ))}
            </Scroller>
          )}
        </section>

        {/* Best Sellers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">Best Sellers</h2>
            <Link href="#" className="underline underline-offset-4 text-sm">
              Shop all
            </Link>
          </div>
          {catalogError ? (
            <p className="text-sm text-red-600">{catalogError}</p>
          ) : catalogLoading ? (
            <p className="text-sm text-neutral-500">Loading products...</p>
          ) : (
            <Scroller>
              {bestSellers.map((item) => (
                <ProductCard
                  key={item.productId}
                  productId={item.productId}
                  title={item.title}
                  price={item.price}
                  originalPrice={item.originalPrice}
                  hasDiscount={item.hasDiscount}
                  img={item.img}
                  averageRating={item.averageRating}
                  reviewCount={item.reviewCount}
                  className="w-[240px] lg:w-[300px]"
                />
              ))}
            </Scroller>
          )}
        </section>

        {/* Explore Our Selection */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold">Explore Our Selection</h2>
          <div className="grid gap-4 md:grid-cols-5">
            {explore.map((item, i) => (
              <Link key={i} href="#" className="rounded-lg border border-[var(--line)] bg-white p-4">
                <div
                  className="aspect-[5/4] rounded-md bg-cover bg-center mb-3 border border-[var(--line)]"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="font-medium">{item.title}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Stories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">Stories</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {stories.map((story, i) => (
              <Link
                key={i}
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--line)] overflow-hidden bg-white"
              >
                <div
                  className="aspect-[16/9] bg-cover bg-center border-b border-[var(--line)]"
                  style={{ backgroundImage: `url('${story.img}')` }}
                />
                <div className="p-4">
                  <div className="text-sm text-[var(--muted)] mb-1">{story.title}</div>
                  <div className="underline underline-offset-4 text-sm">{story.cta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
