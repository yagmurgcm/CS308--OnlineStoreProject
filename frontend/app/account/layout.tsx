"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#f7f7f7]">

      <div className="flex gap-14 px-12 py-12 max-w-[1400px] mx-auto">

        {/* LEFT MENU */}
        <div className="w-60">
          <div className="pb-6 text-xs font-semibold text-gray-500">
            MY ACCOUNT
          </div>

          <div className="flex flex-col space-y-3 text-[15px]">
            <Link href="/account/information" className="hover:underline">Account Information</Link>
            <Link href="/account/orders" className="hover:underline">Orders</Link>
            <Link href="/account/addresses" className="hover:underline">Addresses</Link>
            <Link href="/account/wishlists" className="hover:underline">Wishlists</Link>
            <Link href="/account/settings" className="hover:underline">Account Settings</Link>

            <button
              onClick={logout}
              className="text-left text-red-600 hover:underline pt-2"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-[900px] bg-white rounded-xl p-10 shadow-sm">
            {children}
          </div>
        </div>

      </div>

    </div>
  );
}
