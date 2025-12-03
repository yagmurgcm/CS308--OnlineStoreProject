"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link"; // Tıklama özelliği için gerekli
import { useRouter } from "next/navigation";
import { CART_AUTH_ERROR, useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import Toast from "../components/Toast";
import { checkoutOrder } from "@/lib/orders";

// 1. DÜZELTME: Değişken adını 'formatter' yaptık ve TRY (TL) ayarladık
const formatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, updateQuantity, removeItem, reload } = useCart();
  const hasItems = items.length > 0;
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const decrease = (id: number, quantity: number) => {
    handleQuantityChange(id, quantity - 1);
  };

  const increase = (id: number, quantity: number) => {
    handleQuantityChange(id, quantity + 1);
  };

  const handleQuantityChange = async (id: number, quantity: number) => {
    setCartError(null);
    setPendingId(id);
    try {
      await updateQuantity(id, quantity);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update item";
      setCartError(
        message === CART_AUTH_ERROR
          ? "Please sign in to manage your cart."
          : message,
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setCartError(null);
    setPendingId(id);
    try {
      await removeItem(id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove item";
      setCartError(
        message === CART_AUTH_ERROR
          ? "Please sign in to manage your cart."
          : message,
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleCheckout = async () => {
    setCartError(null);
    setToastMessage(null);
    setCheckoutLoading(true);
    try {
      const order = await checkoutOrder();
      await reload();
      setToastMessage("Order placed successfully. Redirecting to invoice…");
      if (order?.id) {
        router.push(`/account/orders/${order.id}/invoice`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout failed";
      const normalized =
        message === CART_AUTH_ERROR
          ? "Please sign in to checkout."
          : message;
      setToastMessage(normalized);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="container-base py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-neutral-600">
          Review your items below before heading to checkout.
        </p>
        {!user && (
          <p className="text-sm text-neutral-500">
            Sign in to sync your cart across devices and keep items saved.
          </p>
        )}
        {cartError && <p className="text-sm text-red-600">{cartError}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          {hasItems ? (
            items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:flex-row md:items-center"
              >
                {/* 2. DÜZELTME: Resmi Link içine aldık */}
                <Link 
                  href={`/products/${item.productId || item.id}`} 
                  className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* 3. DÜZELTME: Resim yoksa çökmesin diye fallback ekledik */}
                  <Image
                    src={item.image || "/images/1.jpg"}
                    alt={item.name}
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex-1 space-y-1">
                  {/* 4. DÜZELTME: Başlığı Link içine aldık */}
                  <Link href={`/products/${item.productId || item.id}`}>
                    <h2 className="text-lg font-medium leading-tight hover:underline cursor-pointer">
                        {item.name}
                    </h2>
                  </Link>

                  {/* Backend'den renk/beden gelince burası otomatik çalışacak */}
                  {item.color && (
                    <p className="text-sm text-neutral-600">Colour: {item.color}</p>
                  )}
                  {item.size && (
                    <p className="text-sm text-neutral-600">Size: {item.size}</p>
                  )}
                  
                  <span className="inline-flex items-center rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-emerald-600">
                    In Stock
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      className="h-8 w-8 rounded-full border border-[var(--line)] text-lg leading-none disabled:opacity-50"
                      onClick={() => decrease(item.id, item.quantity)}
                      disabled={item.quantity <= 1 || pendingId === item.id}
                      aria-label={`Decrease quantity for ${item.name}`}
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      className="h-8 w-8 rounded-full border border-[var(--line)] text-lg leading-none"
                      onClick={() => increase(item.id, item.quantity)}
                      disabled={pendingId === item.id}
                      aria-label={`Increase quantity for ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right text-neutral-600">
                    Unit price: {formatter.format(item.price)}
                  </div>
                  <div className="text-base font-semibold">
                    Total: {formatter.format(item.price * item.quantity)}
                  </div>
                  <button
                    className="text-xs text-neutral-500 underline"
                    onClick={() => handleRemove(item.id)}
                    type="button"
                    disabled={pendingId === item.id}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
              <p className="text-lg font-medium text-neutral-900">Your cart is empty</p>
              <p className="mt-2 text-sm text-neutral-500">
                {user
                  ? "Browse the catalog and add items to build your order."
                  : "Sign in to start building your cart and keep it saved."}
              </p>
              <Link href={user ? "/" : "/sign-in"} className="btn btn-primary mt-4 inline-flex">
                {user ? "Discover products" : "Sign in"}
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5 rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="space-y-3 text-sm text-neutral-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-neutral-900">
                {formatter.format(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>Add info at checkout</span>
            </div>
            {/* Promo code kaldırıldı veya opsiyonel */}
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatter.format(subtotal)}</span>
            </div>
          </div>

          <button
            className="btn btn-primary w-full"
            disabled={!hasItems || checkoutLoading}
            onClick={handleCheckout}
          >
            {checkoutLoading ? "Processing..." : "Continue to checkout"}
          </button>

          <div className="text-center text-xs text-neutral-500">
            Need help?{" "}
            <Link href="/help" className="underline">
              Contact support
            </Link>
          </div>
        </aside>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastMessage.toLowerCase().includes("success") ? "success" : "error"}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </main>
  );
}
