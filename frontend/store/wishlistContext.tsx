"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Toast from "@/app/components/Toast";
import { usePathname, useRouter } from "next/navigation";

export type WishlistItem = {
  id: string;
  productId: number;
  name: string;
  price: number;
  image: string;
  color?: string;
  size?: string;
  originalPrice?: number;
  discountRate?: number;
};

type WishlistContextType = {
  wishlist: WishlistItem[];
  addItemToWishlist: (item: WishlistItem) => Promise<void>;
  removeItemFromWishlist: (id: string) => Promise<void>;
  loading: boolean;
  error?: string | null;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  // Fetch persisted wishlist when user is available
  useEffect(() => {
    if (!initialized) return;
    if (!user?.id) {
      setWishlist([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<
          {
            id: number;
            productId: number;
            product?: {
              id: number;
              name: string;
              price: number;
              originalPrice?: number;
              discountRate?: number;
              image?: string | null;
            };
          }[]
        >("/wishlist", { cache: "no-store", next: { revalidate: 0 } });

        if (cancelled) return;
        const mapped =
          data?.map((item) => ({
            id: String(item.id),
            productId: item.productId,
            name: item.product?.name ?? "Wishlist item",
            price: item.product?.price ?? 0,
            originalPrice: item.product?.originalPrice,
            discountRate: item.product?.discountRate,
            image: item.product?.image ?? "/images/1.jpg",
          })) ?? [];
        setWishlist(mapped);
        setError(null);
      } catch (error) {
        console.warn("Failed to load wishlist", error);
        if (!cancelled) {
          setWishlist([]);
          setError("Wishlist could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [initialized, user]);

  const addItemToWishlist = useCallback(async (item: WishlistItem) => {
    if (!user?.id) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.push(`/sign-in${redirect}`);
      setToast({ message: "Please sign in to save items to your wishlist.", type: "info" });
      return;
    }
    // Optimistic update
    let rollback: WishlistItem[] | null = null;
    setWishlist((prev) => {
      if (prev.find((p) => p.productId === item.productId)) return prev; // duplicate block
      rollback = prev;
      return [...prev, item];
    });

    try {
      const saved = await api.post<{
        id: number;
        productId: number;
        product?: {
          id: number;
          name: string;
          price: number;
          originalPrice?: number;
          discountRate?: number;
          image?: string | null;
        };
      }>("/wishlist", { productId: item.productId });
      setWishlist((prev) => {
        const next = prev.filter((p) => p.productId !== item.productId);
        next.push({
          id: String(saved.id),
          productId: saved.productId,
          name: saved.product?.name ?? item.name,
          price: saved.product?.price ?? item.price,
          originalPrice: saved.product?.originalPrice ?? item.originalPrice,
          discountRate: saved.product?.discountRate ?? item.discountRate,
          image: saved.product?.image ?? item.image,
        });
        return next;
      });
      setError(null);
      setToast({ message: "Added to wishlist.", type: "success" });
    } catch (error) {
      console.error("Failed to persist wishlist item", error);
      if (rollback) setWishlist(rollback);
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not add to wishlist. Please try again.",
        type: "error",
      });
    }
  }, [pathname, router, user]);

  const removeItemFromWishlist = useCallback(async (id: string) => {
    const target = wishlist.find((w) => w.id === id);
    const snapshot = wishlist;
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    if (!target) return;
    try {
      await api.delete(`/wishlist/${target.productId}`);
      setError(null);
      setToast({ message: "Removed from wishlist.", type: "info" });
    } catch (error) {
      console.error("Failed to remove wishlist item", error);
      setWishlist(snapshot);
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not remove from wishlist. Please try again.",
        type: "error",
      });
    }
  }, [wishlist]);

  return (
    <WishlistContext.Provider
      value={{ wishlist, addItemToWishlist, removeItemFromWishlist, loading, error }}
    >
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
          durationMs={3000}
        />
      )}
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
