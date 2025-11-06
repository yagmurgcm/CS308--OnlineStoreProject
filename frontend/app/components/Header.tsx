"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Sign-in sheet import
const SignInSheet = dynamic(() => import("./SignInSheet"), { ssr: false });

type Cat = { label: string; href?: string };
type CartItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
};

const WOMEN: Cat[] = [
  { label: "New In" },
  { label: "Outerwear" },
  { label: "Knitwear" },
  { label: "Shirts & Blouses" },
  { label: "Bottoms" },
  { label: "Underwear & Socks" },
  { label: "Accessories" },
];

const MEN: Cat[] = [
  { label: "New In" },
  { label: "Coats & Jackets" },
  { label: "Knitwear" },
  { label: "Shirts" },
  { label: "Bottoms" },
  { label: "Underwear & Socks" },
  { label: "Accessories" },
];

const BEAUTY: Cat[] = [
  { label: "Skincare" },
  { label: "Body Care" },
  { label: "Hair Care" },
  { label: "Fragrance" },
  { label: "Tools & Accessories" },
];

const CART_ITEMS: CartItem[] = [
  {
    id: "kapok-chore-jacket",
    name: "Men's Kapok Blend Corduroy Chore Jacket",
    color: "Dark Brown",
    size: "XL",
    quantity: 1,
    price: 79.95,
    image: "/images/d1.jpg",
  },
  {
    id: "washed-denim",
    name: "Relaxed Washed Denim Jacket",
    color: "Indigo",
    size: "L",
    quantity: 1,
    price: 59.95,
    image: "/images/d2.jpg",
  },
  {
    id: "wool-knit",
    name: "Soft Wool Crewneck Knit",
    color: "Olive",
    size: "M",
    quantity: 1,
    price: 49.95,
    image: "/images/d4.jpg",
  },
];

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

// pastel autumn colors (background options)
const autumnPalette = {
  bg: "#f2e4d6", // pastel beige / soft brown tone
  text: "#7b4a2e", // brownish text
};

function AutumnGrid() {
  const items = [
    "Autumn Layers",
    "Natural Tones",
    "Soft Linen",
    "Wool & Warmth",
    "Earth Shades",
    "Minimal Comfort",
  ];
  return (
    <div
      className="grid grid-cols-2 gap-3 rounded-lg p-4"
      style={{ backgroundColor: autumnPalette.bg }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-md py-4 px-3 text-center border border-[var(--line)] hover:bg-white/70 transition"
        >
          <p className="text-sm font-medium" style={{ color: autumnPalette.text }}>
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

function MegaDrop({ items }: { items: Cat[] }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-full z-50 w-[90vw] max-w-[880px] -translate-x-1/2
                 origin-top translate-y-3 opacity-0 rounded-xl border border-[var(--line)]
                 bg-white shadow-lg transition-all duration-200 ease-out
                 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
      role="menu"
      aria-label="submenu"
    >
      <div className="grid md:grid-cols-[260px_1fr] gap-6 p-6">
        {/* Sol kısım: ana kategoriler */}
        <ul className="grid grid-cols-2 gap-y-1.5">
          {items.map((c, i) => (
            <li key={i}>
              <Link
                href={c.href ?? "#"}
                className="block px-2 py-1.5 text-[15px] hover:bg-[var(--background)]/70 rounded-md"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Sağ kısım: pastel grid */}
        <AutumnGrid />
      </div>
    </div>
  );
}

function CartPreview({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleOpenCart = () => {
    router.push("/cart");
  };

  return (
    <div className="relative group">
      <button
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--foreground)] transition hover:bg-white"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-label={`Shopping cart, ${totalItems} item${totalItems > 1 ? "s" : ""}`}
        type="button"
        onClick={handleOpenCart}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6" />
        </svg>
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6b0015] px-1 text-xs font-semibold text-white">
          {totalItems}
        </span>
      </button>

      <div
        className="pointer-events-none absolute right-0 top-full z-50 mt-3 w-[320px] max-w-[calc(100vw-2rem)] translate-y-2 rounded-2xl border border-[var(--line)] bg-white text-sm shadow-xl opacity-0 transition-all duration-200 ease-out
                   group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100
                   group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"
        role="dialog"
        aria-label="Cart preview"
      >
        <div className="absolute -top-2 right-9 h-4 w-4 rotate-45 border border-[var(--line)] border-b-0 border-r-0 bg-white" />
        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
              Item(s) in your cart
            </p>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--background)]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight text-neutral-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Colour: {item.color}
                  </p>
                  <p className="text-xs text-neutral-500">Size: {item.size}</p>
                  <div className="mt-1 text-sm font-medium">
                    {item.quantity} x {priceFormatter.format(item.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-semibold">
                {priceFormatter.format(subtotal)}
              </span>
            </div>
            <Link href="/cart" className="btn btn-primary w-full text-center">
              View cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="bg-white/90 backdrop-blur border-b border-[var(--line)] sticky top-0 z-40">
        {/* Üst kısım */}
        <div className="container-base h-16 grid grid-cols-3 items-center">
          <div />
          <div className="text-center">
            <Link href="/" className="inline-block text-xl font-semibold tracking-[0.2em]">
              FATIH
            </Link>
          </div>
          <div className="flex items-center justify-end gap-3">
            <CartPreview items={CART_ITEMS} />
            <button onClick={() => setOpen(true)} className="pill">Sign in</button>
            <Link href="/sign-up" className="pill">Sign up</Link>
          </div>
        </div>

        {/* Alt navigasyon */}
        <div className="container-base h-12">
          <nav className="h-full flex items-center justify-center gap-8">
            <div className="relative group">
              <Link href="/women" className="text-sm hover:underline underline-offset-4">
                Women
              </Link>
              <MegaDrop items={WOMEN} />
            </div>
            <div className="relative group">
              <Link href="/men" className="text-sm hover:underline underline-offset-4">
                Men
              </Link>
              <MegaDrop items={MEN} />
            </div>
            <div className="relative group">
              <Link href="/beauty" className="text-sm hover:underline underline-offset-4">
                Beauty
              </Link>
              <MegaDrop items={BEAUTY} />
            </div>
          </nav>
        </div>
      </header>

      {/* Sign-in panel */}
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
