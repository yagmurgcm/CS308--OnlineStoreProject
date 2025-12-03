"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type WishlistItem = {
  id: string;
  productId: number;
  name: string;
  price: number;
  image: string;
  color?: string;
  size?: string;
};

type WishlistContextType = {
  wishlist: WishlistItem[];
  addItemToWishlist: (item: WishlistItem) => void;
  removeItemFromWishlist: (id: string) => void;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const addItemToWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      if (prev.find((p) => p.id === item.id)) return prev; // duplicate block
      return [...prev, item];
    });
  };

  const removeItemFromWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addItemToWishlist, removeItemFromWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
