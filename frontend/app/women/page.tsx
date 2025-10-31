"use client";

import CategoryProductCard, {
  CategoryProduct,
} from "../components/CategoryProductCard";

const SUB_CATEGORIES = [
  "New In",
  "Coats & Jackets",
  "Knitwear",
  "Dresses",
  "Shirts & Blouses",
  "Bottoms",
  "Loungewear",
  "Accessories",
];

const PRODUCTS: CategoryProduct[] = [
  {
    id: "womens-cashmere-blend-coat",
    name: "Women's Cashmere Blend Coat",
    price: 199.0,
    image: "/images/d4.jpg",
    colors: ["#E3D9CF", "#443C37", "#111111"],
    badge: "New in",
  },
  {
    id: "womens-double-face-wool-coat",
    name: "Women's Double Face Wool Coat",
    price: 189.95,
    image: "/images/1.jpg",
    colors: ["#B8B2AA", "#382E2E"],
    badge: "New in",
  },
  {
    id: "womens-long-padded-parka",
    name: "Women's Long Padded Parka",
    price: 149.95,
    image: "/images/2.jpg",
    colors: ["#565C5B", "#D7D4CD"],
  },
  {
    id: "womens-wool-tweed-jacket",
    name: "Women's Wool Tweed Jacket",
    price: 129.95,
    image: "/images/3.jpg",
    colors: ["#3D3733", "#CFC5B9"],
  },
  {
    id: "womens-light-down-vest",
    name: "Women's Light Down Vest",
    price: 89.95,
    image: "/images/4.jpg",
    colors: ["#45403D", "#ADA79B"],
  },
  {
    id: "womens-oversized-flannel-shirt",
    name: "Women's Oversized Flannel Shirt Jacket",
    price: 79.95,
    image: "/images/5.jpg",
    colors: ["#6B625C", "#E6DED5"],
  },
  {
    id: "womens-ribbed-knit-cardigan",
    name: "Women's Ribbed Knit Cardigan",
    price: 64.5,
    image: "/images/6.jpg",
    colors: ["#F2ECE5", "#8B7C6A"],
  },
  {
    id: "womens-utility-field-jacket",
    name: "Women's Utility Field Jacket",
    price: 109.95,
    image: "/images/d1.jpg",
    colors: ["#343934", "#9DA48E"],
  },
  {
    id: "womens-water-repellent-trench",
    name: "Women's Water Repellent Trench",
    price: 139.95,
    image: "/images/d2.jpg",
    colors: ["#CFBDA3", "#4A4031"],
  },
  {
    id: "womens-linen-blend-blazer",
    name: "Women's Linen Blend Blazer",
    price: 119.0,
    image: "/images/d3.png",
    colors: ["#F1E7D4", "#34312B"],
  },
  {
    id: "womens-textured-short-coat",
    name: "Women's Textured Short Coat",
    price: 129.95,
    image: "/images/d5.jpg",
    colors: ["#4D4B47", "#B7B3AB"],
  },
  {
    id: "womens-brushed-wool-jacket",
    name: "Women's Brushed Wool Jacket",
    price: 124.95,
    image: "/images/d4.jpg",
    colors: ["#2C2826", "#C5B7AC"],
  },
];

export default function WomenCategoryPage() {
  const totalItems = PRODUCTS.length;

  return (
    <main className="container-base space-y-10 py-12">
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Women
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Coats & Jackets
          </h1>
          <p className="text-sm text-neutral-600">
            Layer up with refined silhouettes and warm textures.
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 border-b border-[var(--line)] pb-3 text-sm">
          {SUB_CATEGORIES.map((category, index) => {
            const isActive = index === 1;
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
        <span className="text-neutral-500">{totalItems} items</span>
        <div className="flex gap-2">
          <button className="btn h-10 px-5">Filter</button>
          <button className="btn h-10 px-5">Sort by</button>
        </div>
      </section>

      <section>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRODUCTS.map((product) => (
            <CategoryProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}

