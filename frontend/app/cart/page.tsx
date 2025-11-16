"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

const formatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const hasItems = items.length > 0;

  const decrease = (id: string, quantity: number) => {
    updateQuantity(id, quantity - 1);
  };

  const increase = (id: string, quantity: number) => {
    updateQuantity(id, quantity + 1);
  };

  return (
    <main className="container-base py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-neutral-600">
          Review your items below before heading to checkout.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          {hasItems ? (
            items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm md:flex-row md:items-center"
              >
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <h2 className="text-lg font-medium leading-tight">{item.name}</h2>
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
                      disabled={item.quantity <= 1}
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
                    onClick={() => removeItem(item.id)}
                    type="button"
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
                Browse the catalog and add items to build your order.
              </p>
              <Link href="/" className="btn btn-primary mt-4 inline-flex">
                Discover products
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
            <div className="flex items-center justify-between">
              <span>Promo code</span>
              <button className="text-xs font-medium uppercase tracking-wide text-neutral-900">
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatter.format(subtotal)}</span>
            </div>
          </div>

          <button className="btn btn-primary w-full" disabled={!hasItems}>
            Continue to checkout
          </button>

          <div className="text-center text-xs text-neutral-500">
            Need help?{" "}
            <Link href="/help" className="underline">
              Contact support
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
