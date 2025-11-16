import Link from "next/link";
import Hero from "./components/Hero";
import Scroller from "./components/Scroller";
import ProductCard from "./components/ProductCard";

const featured = [
  { title: "Women's Coats", img: "/images/1.jpg" },
  { title: "Men's Knitwear", img: "/images/2.jpg" },
  { title: "Home Fragrance", img: "/images/3.jpg" },
  { title: "Storage Essentials", img: "/images/4.jpg" },
  { title: "Beauty Picks", img: "/images/5.jpg" },
  { title: "Desk Refresh", img: "/images/d1.jpg" },
  { title: "Travel Organisers", img: "/images/d2.jpg" },
  { title: "Soft Bedding", img: "/images/d3.png" },
  { title: "Minimal Decor", img: "/images/d4.jpg" },
];

const newArrivals = [
  { id: "wool-blend-coat", title: "Wool Blend Coat", price: 179.95, img: "/images/2.jpg" },
  { id: "soft-knit-sweater", title: "Soft Knit Sweater", price: 89.95, img: "/images/6.jpg" },
  { id: "sandalwood-candle", title: "Sandalwood Candle", price: 29.95, img: "/images/3.jpg" },
  { id: "rattan-storage-box", title: "Rattan Storage Box", price: 39.95, img: "/images/4.jpg" },
  { id: "amber-eau-de-toilette", title: "Amber Eau de Toilette", price: 49.95, img: "/images/5.jpg" },
  { id: "linen-blend-shirt", title: "Linen Blend Shirt", price: 69.95, img: "/images/1.jpg" },
  { id: "minimal-desk-lamp", title: "Minimal Desk Lamp", price: 120.0, img: "/images/d1.jpg" },
  { id: "weekender-tote", title: "Weekender Tote", price: 95.5, img: "/images/d2.jpg" },
  { id: "quilted-duvet-set", title: "Quilted Duvet Set", price: 149.99, img: "/images/d3.png" },
  { id: "calming-diffuser", title: "Calming Diffuser", price: 44.25, img: "/images/d4.jpg" },
  { id: "compact-vanity-mirror", title: "Compact Vanity Mirror", price: 58.0, img: "/images/d5.jpg" },
];

const bestSellers = [
  { id: "minimal-backpack", title: "Minimal Backpack", price: 99.95, img: "/images/4.jpg" },
  { id: "cashmere-scarf", title: "Cashmere Scarf", price: 59.95, img: "/images/2.jpg" },
  { id: "essential-desk-set", title: "Essential Desk Set", price: 45.5, img: "/images/d1.jpg" },
  { id: "stoneware-tea-set", title: "Stoneware Tea Set", price: 74.0, img: "/images/5.jpg" },
  { id: "classic-bathrobe", title: "Classic Bathrobe", price: 120.0, img: "/images/d3.png" },
  { id: "travel-tote", title: "Travel Tote", price: 85.75, img: "/images/d2.jpg" },
  { id: "warm-throw-blanket", title: "Warm Throw Blanket", price: 64.5, img: "/images/d4.jpg" },
  { id: "scented-oil-set", title: "Scented Oil Set", price: 34.75, img: "/images/d5.jpg" },
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
  },
  {
    title: "Inside the Atelier: Crafting Linen",
    cta: "Discover the process",
    img: "/images/d3.png",
  },
  {
    title: "Everyday Storage Tips",
    cta: "Get the guide",
    img: "/images/d4.jpg",
  },
  {
    title: "Daily Rituals: Calm Mornings",
    cta: "Explore routines",
    img: "/images/d5.jpg",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <div className="container-base space-y-14 md:space-y-16">
        {/* Featured this week */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">Featured this week</h2>
            <Link href="#" className="underline underline-offset-4 text-sm">
              See all
            </Link>
          </div>
          <Scroller>
            {featured.map((item, i) => (
              <Link
                key={i}
                href="#"
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

        {/* Wide banner */}
        <section>
          <div className="rounded-lg border border-[var(--line)] overflow-hidden bg-white">
            <div className="h-52 md:h-72 bg-[var(--background)] grid place-items-center border-b border-[var(--line)] text-[13px] tracking-[0.18em] text-[var(--muted)] uppercase">
              Bedding / Linen / Towels
            </div>
            <div className="p-6 md:p-8 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">A cosy autumn.</h3>
                <p className="text-[var(--muted)]">Shop the edit / Home fragrance / Linen</p>
              </div>
              <Link href="#" className="underline underline-offset-4">
                Shop now
              </Link>
            </div>
          </div>
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
          <Scroller>
            {newArrivals.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                title={item.title}
                price={item.price}
                img={item.img}
                className="w-[260px] lg:w-[300px]"
              />
            ))}
          </Scroller>
        </section>

        {/* Best Sellers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold">Best Sellers</h2>
            <Link href="#" className="underline underline-offset-4 text-sm">
              Shop all
            </Link>
          </div>
          <Scroller>
            {bestSellers.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                title={item.title}
                price={item.price}
                img={item.img}
                className="w-[240px] lg:w-[300px]"
              />
            ))}
          </Scroller>
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
                href="#"
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
