"use client";

import CategoryProductCard, {
  CategoryProduct,
} from "../components/CategoryProductCard";

const SUB_CATEGORIES = [
  "Skincare",
  "Body Care",
  "Hair Care",
  "Fragrance",
  "Bath",
  "Tools & Accessories",
  "Makeup",
  "Travel Sizes",
];

const PRODUCTS: CategoryProduct[] = [
  {
    id: "light-toning-water",
    name: "Light Toning Water - High Moisture",
    price: 12.95,
    image: "/images/5.jpg",
    colors: ["#F6F2ED"],
    badge: "Best seller",
  },
  {
    id: "moisturising-milk",
    name: "Moisturising Milk",
    price: 14.5,
    image: "/images/3.jpg",
    colors: ["#F1ECE7"],
  },
  {
    id: "anti-aging-essence",
    name: "Anti-Aging Essence",
    price: 24.95,
    image: "/images/d1.jpg",
    colors: ["#F8F4EE", "#D8C9B8"],
  },
  {
    id: "cleansing-oil",
    name: "Mild Cleansing Oil",
    price: 19.95,
    image: "/images/d2.jpg",
    colors: ["#F7F0E4", "#E7D9C6"],
  },
  {
    id: "face-soap",
    name: "Face Soap - Moisture",
    price: 7.95,
    image: "/images/d3.png",
    colors: ["#F9F4EA"],
  },
  {
    id: "cotton-sheet-mask",
    name: "Compressed Facial Cotton Sheet Mask (20 pack)",
    price: 4.95,
    image: "/images/d4.jpg",
    colors: ["#F3E6DB"],
  },
  {
    id: "jojoba-oil",
    name: "Organic Jojoba Oil",
    price: 13.5,
    image: "/images/d5.jpg",
    colors: ["#FDF3E4", "#E0C39F"],
  },
  {
    id: "wooden-massage-brush",
    name: "Wooden Massage Brush",
    price: 16.95,
    image: "/images/6.jpg",
    colors: ["#F6EADA", "#BA9470"],
  },
  {
    id: "gentle-foam-cleanser",
    name: "Gentle Foam Cleanser",
    price: 9.95,
    image: "/images/4.jpg",
    colors: ["#F5EDE0"],
  },
  {
    id: "sheet-mask-set",
    name: "Botanical Sheet Mask Set (5 pack)",
    price: 11.95,
    image: "/images/5.jpg",
    colors: ["#F4EBE1", "#E1D1C0"],
  },
  {
    id: "lip-balm",
    name: "Shea Butter Lip Balm",
    price: 6.5,
    image: "/images/2.jpg",
    colors: ["#F4ECE0", "#D4B8A0"],
  },
  {
    id: "bath-salts",
    name: "Aromatherapy Bath Salts",
    price: 15.95,
    image: "/images/1.jpg",
    colors: ["#F5E7D4", "#C0A486"],
  },
];

export default function BeautyCategoryPage() {
  const totalItems = PRODUCTS.length;

  return (
    <main className="container-base space-y-10 py-12">
      <section className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Beauty
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Skincare Essentials
          </h1>
          <p className="text-sm text-neutral-600">
            Minimal formulas for everyday hydration and balance.
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

