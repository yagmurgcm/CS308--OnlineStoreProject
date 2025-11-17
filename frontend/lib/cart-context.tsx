"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";

export type CartItem = {
  id: number;
  productId: number;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  color?: string | null;
  size?: string | null;
};

export type CartItemInput = {
  productId: number;
  quantity?: number;
  name?: string;
  price?: number;
  image?: string | null;
  color?: string | null;
  size?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
  reload: () => Promise<void>;
  addItem: (item: CartItemInput) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const CART_AUTH_ERROR = "CART_AUTH_REQUIRED";

type ServerCartItem = { id: number; productId: number; quantity: number };
type CartResponse = { id: number; userId: number; items: ServerCartItem[] };

type ProductSummary = {
  id: number;
  name: string;
  price: number | string;
  image?: string | null;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function coercePrice(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const productCache = useRef<Map<number, ProductSummary>>(new Map());

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const fetchProductSummary = useCallback(async (productId: number) => {
    const cached = productCache.current.get(productId);
    if (cached) return cached;
    const product = await api.get<ProductSummary>(`/products/${productId}`);
    productCache.current.set(productId, product);
    return product;
  }, []);

  const hydrateItems = useCallback(
    async (serverItems: ServerCartItem[]): Promise<CartItem[]> => {
      const hydrated = await Promise.all(
        serverItems.map(async (line) => {
          try {
            const product = await fetchProductSummary(line.productId);
            return {
              id: line.id,
              productId: product.id,
              name: product.name,
              price: coercePrice(product.price),
              image: product.image ?? null,
              quantity: line.quantity,
            };
          } catch (error) {
            console.warn("Missing product info for cart item", error);
            return {
              id: line.id,
              productId: line.productId,
              name: "Product",
              price: 0,
              image: null,
              quantity: line.quantity,
            };
          }
        }),
      );
      return hydrated;
    },
    [fetchProductSummary],
  );

  const loadCart = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) {
        if (mountedRef.current) {
          setItems([]);
          setIsLoading(false);
          productCache.current.clear();
        }
        return;
      }
      if (mountedRef.current) {
        setIsLoading(true);
      }
      try {
        const cart = await api.get<CartResponse | null>(`/cart/${userId}`);
        const hydrated = await hydrateItems(cart?.items ?? []);
        if (mountedRef.current) {
          setItems(hydrated);
        }
      } catch (error) {
        console.error("Failed to load cart", error);
        if (!options?.silent) {
          throw error instanceof Error
            ? error
            : new Error("Failed to load cart");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [userId, hydrateItems],
  );

  useEffect(() => {
    loadCart({ silent: true }).catch(() => undefined);
  }, [loadCart]);

  const ensureAuthenticated = useCallback(() => {
    if (!userId) {
      throw new Error(CART_AUTH_ERROR);
    }
  }, [userId]);

  const removeItem = useCallback(
    async (itemId: number) => {
      ensureAuthenticated();
      try {
        await api.delete(`/cart/${userId}/items/${itemId}`);
        await loadCart({ silent: false });
      } catch (error) {
        console.error("Failed to remove cart item", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to remove cart item");
      }
    },
    [ensureAuthenticated, userId, loadCart],
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      ensureAuthenticated();
      if (quantity <= 0) {
        return removeItem(itemId);
      }
      try {
        await api.patch<CartResponse>(`/cart/${userId}/items`, {
          itemId,
          quantity,
        });
        await loadCart({ silent: false });
      } catch (error) {
        console.error("Failed to update cart item", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to update cart item");
      }
    },
    [ensureAuthenticated, userId, loadCart, removeItem],
  );

  const addItem = useCallback(
    async ({ productId, quantity = 1 }: CartItemInput) => {
      ensureAuthenticated();
      const normalizedQty = Math.max(1, quantity);
      try {
        await api.post<CartResponse>(`/cart/${userId}/items`, {
          productId,
          quantity: normalizedQty,
        });
        await loadCart({ silent: false });
      } catch (error) {
        console.error("Failed to add to cart", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to add to cart");
      }
    },
    [ensureAuthenticated, userId, loadCart],
  );

  const clearCart = useCallback(async () => {
    ensureAuthenticated();
    try {
      await api.delete(`/cart/${userId}/clear`);
      await loadCart({ silent: false });
    } catch (error) {
      console.error("Failed to clear cart", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to clear cart");
    }
  }, [ensureAuthenticated, userId, loadCart]);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.quantity * item.price, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      subtotal,
      isLoading,
      reload: () => loadCart({ silent: false }),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      totalItems,
      subtotal,
      isLoading,
      loadCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
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
