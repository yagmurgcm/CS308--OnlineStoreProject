"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function UserStatus() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Minimalist tasarım için isim göstermiyoruz, sadece ikona tıklayınca profile gidecek.
  return (
    <Link
      href="/account"
      className="group flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition-all duration-300 hover:border-black hover:bg-black hover:text-white"
      aria-label="My Account"
    >
      {/* İnsan İkonu (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    </Link>
  );
}