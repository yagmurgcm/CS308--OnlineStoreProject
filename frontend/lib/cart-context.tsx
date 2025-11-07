"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
};

export type CartItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
};

const STORAGE_KEY = "fatih_cart_items";

const CartContext = createContext<CartContextValue | undefined>(undefined);

const sanitizeItems = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as CartItem).id !== "string" ||
        typeof (item as CartItem).name !== "string" ||
        typeof (item as CartItem).image !== "string" ||
        typeof (item as CartItem).price !== "number" ||
        typeof (item as CartItem).quantity !== "number"
      ) {
        return null;
      }
      return {
        id: (item as CartItem).id,
        name: (item as CartItem).name,
        image: (item as CartItem).image,
        price: (item as CartItem).price,
        quantity: (item as CartItem).quantity,
        color: (item as CartItem).color,
        size: (item as CartItem).size,
      } satisfies CartItem;
    })
    .filter((item): item is CartItem => item !== null);
};

const readStoredCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return sanitizeItems(JSON.parse(stored));
  } catch (error) {
    console.warn("Failed to parse stored cart", error);
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartItemInput) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.id === item.id
            ? {
                ...line,
                quantity: line.quantity + (item.quantity ?? 1),
              }
            : line,
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: Math.max(1, item.quantity ?? 1),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item,
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.quantity * item.price, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
