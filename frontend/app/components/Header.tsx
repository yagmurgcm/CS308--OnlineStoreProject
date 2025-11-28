"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import UserStatus from "./UserStatus";

// Sign-in sheet import
const SignInSheet = dynamic(() => import("./SignInSheet"), { ssr: false });

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

// CART DROPDOWN
function CartPreview() {
  const router = useRouter();
  const { items, subtotal, totalItems } = useCart();
  const hasItems = items.length > 0;

  const [openPreview, setOpenPreview] = useState(false);

  const handleOpenCart = () => {
    setOpenPreview(false);
    router.push(hasItems ? "/cart" : "/");
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpenPreview(true)}
      onMouseLeave={() => setOpenPreview(false)}
    >
      {/* CART BUTTON */}
      <button
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white transition hover:bg-white"
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

        {/* ITEM COUNT BADGE */}
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6b0015] px-1 text-xs font-semibold text-white">
          {totalItems}
        </span>
      </button>

      {/* DROPDOWN */}
      <div
        className={`absolute right-0 top-full z-50 mt-3 w-[320px] rounded-2xl border bg-white shadow-xl transition-all duration-200
          ${
            openPreview
              ? "opacity-100 pointer-events-auto translate-y-0"
              : "opacity-0 pointer-events-none translate-y-2"
          }`}
      >
        <div className="absolute -top-2 right-9 h-4 w-4 rotate-45 border border-[var(--line)] border-b-0 border-r-0 bg-white" />

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Item(s) in your cart
          </p>

          {/* ITEMS */}
          <div className="space-y-4">
            {hasItems ? (
              items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-md border bg-[var(--background)]">
                    <Image
                      src={item.image ?? "/fallback.png"}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Colour: {item.color ?? "-"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Size: {item.size ?? "-"}
                    </p>
                    <div className="mt-1 text-sm font-medium">
                      {item.quantity} ×{" "}
                      {priceFormatter.format(item.price)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">Your cart is empty.</p>
            )}
          </div>

          {/* SUBTOTAL */}
          <div className="border-t border-[var(--line)] pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-semibold">
                {priceFormatter.format(subtotal)}
              </span>
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );
}

// HEADER
export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const displayName = user?.name || user?.email || "User";

  // Sign-in modal open logic
  useEffect(() => {
    if (open) return;

    const shouldOpen = searchParams.get("auth") === "signin";
    if (!shouldOpen) return;

    setOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    router.replace(params.toString() ? `${pathname}?${params}` : pathname);
  }, [open, pathname, router, searchParams]);

  return (
    <>
      <header className="bg-white/90 backdrop-blur border-b border-[var(--line)] sticky top-0 z-40">

        {/* TOP BAR */}
        <div className="container-base h-16 grid grid-cols-[1fr_auto_1fr] items-center">

          {/* LEFT: SEARCH */}
          <div className="flex items-center">
            <div className="hidden md:flex items-center w-72 relative">
              <input
                type="text"
                placeholder="Search products…"
                className="w-full border border-gray-300 rounded-full py-1.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute right-3 text-gray-500"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* CENTER LOGO */}
          <div className="text-center">
            <Link href="/" className="text-xl font-semibold tracking-[0.2em]">
              FATIH
            </Link>
          </div>

          {/* RIGHT: USER + CART + NAME + LOGOUT */}
          <div className="flex items-center justify-end gap-4">
            <UserStatus />
            <CartPreview />

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {displayName}
                </span>
                <button onClick={handleLogout} className="pill">
                  Log out
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setOpen(true)} className="pill">
                  Sign in
                </button>
                <Link href="/sign-up" className="pill">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="container-base h-12">
          <nav className="h-full flex items-center justify-center gap-8">
            <Link href="/women" className="text-sm hover:underline underline-offset-4">
              Women
            </Link>
            <Link href="/men" className="text-sm hover:underline underline-offset-4">
              Men
            </Link>
            <Link href="/beauty" className="text-sm hover:underline underline-offset-4">
              Beauty
            </Link>
          </nav>
        </div>
      </header>

      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
