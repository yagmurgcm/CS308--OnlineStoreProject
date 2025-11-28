"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();      // token + user temizleniyor
    router.push("/");    // 🔥 ana sayfaya at
  };

  return (
    <div className="flex gap-10 px-10 mt-10">

      {/* LEFT MENU */}
      <div className="w-64">
        <div className="pb-6 text-xs font-semibold text-gray-500">MY ACCOUNT</div>

        <div className="flex flex-col space-y-2 text-sm">

          <Link href="/account/information" className="hover:underline">
            Account Information
          </Link>

          <Link href="/account/orders" className="hover:underline">Orders</Link>
          <Link href="/account/addresses" className="hover:underline">Addresses</Link>
          <Link href="/account/wishlists" className="hover:underline">Wishlists</Link>
          <Link href="/account/settings" className="hover:underline">Account Settings</Link>

          {/* SIGN OUT BUTTON */}
          <button
            onClick={handleSignOut}
            className="text-left px-2 py-1 text-red-600 hover:underline"
          >
            Sign Out
          </button>

        </div>
      </div>

      {/* RIGHT PAGE CONTENT */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
