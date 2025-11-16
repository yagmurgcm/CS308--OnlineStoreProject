"use client";

import CategoryProductCard, {
  CategoryProduct,
} from "../components/CategoryProductCard";

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

const PRODUCTS: CategoryProduct[] = [
  {
    id: "mens-padded-hooded-jacket",
    name: "Men's Padded Hooded Jacket",
    price: 99.95,
    image: "/images/1.jpg",
    colors: ["#2E312F", "#BEBFC4", "#D9D6D0"],
    badge: "New in",
  },
  {
    id: "mens-kapok-blend-corduroy-collar-jacket",
    name: "Men's Kapok Blend Corduroy Collar Jacket",
    price: 79.95,
    image: "/images/d2.jpg",
    colors: ["#CEC0A6", "#6F6353", "#1E1C1A"],
    badge: "New in",
  },
  {
    id: "mens-kapok-blend-corduroy-chore-jacket",
    name: "Men's Kapok Blend Corduroy Chore Jacket",
    price: 79.95,
    image: "/images/d1.jpg",
    colors: ["#3E3023", "#C9C1B7"],
    badge: "New in",
  },
  {
    id: "mens-brushed-flannel-shirt-jacket",
    name: "Men's Brushed Flannel Shirt Jacket",
    price: 49.95,
    image: "/images/d4.jpg",
    colors: ["#1A1C1F", "#676C70"],
  },
  {
    id: "mens-wool-blend-mac-coat",
    name: "Men's Wool Blend Mac Coat",
    price: 129.0,
    image: "/images/6.jpg",
    colors: ["#1F2327", "#8A8D91"],
  },
  {
    id: "mens-water-repellent-parka",
    name: "Men's Water Repellent Parka",
    price: 119.95,
    image: "/images/d3.png",
    colors: ["#4A4D46", "#D9D8D0"],
  },
  {
    id: "mens-light-down-jacket",
    name: "Men's Light Down Jacket",
    price: 89.95,
    image: "/images/2.jpg",
    colors: ["#3C403F", "#D4D4D6"],
  },
  {
    id: "mens-fleece-lined-coach-jacket",
    name: "Men's Fleece Lined Coach Jacket",
    price: 84.5,
    image: "/images/d5.jpg",
    colors: ["#1F1E21", "#B7B5AF"],
  },
  {
    id: "mens-stretch-twill-jacket",
    name: "Men's Stretch Twill Jacket",
    price: 74.95,
    image: "/images/4.jpg",
    colors: ["#403D3A", "#D7D2C7"],
  },
  {
    id: "mens-overshirt-in-wool",
    name: "Men's Overshirt in Wool",
    price: 69.95,
    image: "/images/5.jpg",
    colors: ["#221E1E", "#8F7E6B"],
  },
  {
    id: "mens-hybrid-down-short-coat",
    name: "Men's Hybrid Down Short Coat",
    price: 149.95,
    image: "/images/3.jpg",
    colors: ["#2A2B2A", "#4C4E4A"],
  },
  {
    id: "mens-water-resistant-blazer",
    name: "Men's Water Resistant Blazer",
    price: 139.95,
    image: "/images/2.jpg",
    colors: ["#191A1C", "#6E6F72"],
  },
];

export default function MenCategoryPage() {
  const totalItems = PRODUCTS.length;

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

