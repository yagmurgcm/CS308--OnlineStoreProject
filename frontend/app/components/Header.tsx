"use client";
import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";

// Sign-in sheet import
const SignInSheet = dynamic(() => import("./SignInSheet"), { ssr: false });

type Cat = { label: string; href?: string };

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
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setOpen(true)} className="pill">Sign in</button>
            <Link href="/sign-up" className="pill">Sign up</Link>
          </div>
        </div>

        {/* Alt navigasyon */}
        <div className="container-base h-12">
          <nav className="h-full flex items-center justify-center gap-8">
            <div className="relative group">
              <button className="text-sm hover:underline underline-offset-4">Women</button>
              <MegaDrop items={WOMEN} />
            </div>
            <div className="relative group">
              <button className="text-sm hover:underline underline-offset-4">Men</button>
              <MegaDrop items={MEN} />
            </div>
            <div className="relative group">
              <button className="text-sm hover:underline underline-offset-4">Beauty</button>
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
