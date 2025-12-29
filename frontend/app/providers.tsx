"use client";

import { WishlistProvider } from "@/store/wishlistContext";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
