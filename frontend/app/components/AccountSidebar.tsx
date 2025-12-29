"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Wishlists", href: "/account/wishlists" },
  { label: "Recently Viewed", href: "/account/recent" },
  { label: "Account Settings", href: "/account/settings" },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-52 shrink-0 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        My Account
      </div>

      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 transition ${
                active ? "bg-black text-white shadow-sm" : "text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-left text-neutral-800 transition hover:bg-neutral-100"
        >
          Sign Out
        </button>
      </nav>
    </aside>
  );
}
