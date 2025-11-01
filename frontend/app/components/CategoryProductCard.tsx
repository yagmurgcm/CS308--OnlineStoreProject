"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export type CategoryProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  colors?: string[];
  badge?: string;
};

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function CategoryProductCard({
  product,
}: {
  product: CategoryProduct;
}) {
  const router = useRouter();
  const { name, price, image, colors = [], badge } = product;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onAdd() {
    const idNum = Number(product.id);
    if (!idNum || Number.isNaN(idNum)) {
      router.push("/products");
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      router.push("/sign-in");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      await api.post("/cart/items", { productId: idNum, quantity: 1 });
      setMessage("Added to cart");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 1500);
    }
  }

  return (
    <article className="group space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="relative aspect-[3/4]">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 28vw, (min-width: 768px) 45vw, 85vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            priority={false}
          />
        </div>
      </div>

      <div className="space-y-2">
        {colors.length > 0 && (
          <div className="flex items-center gap-1.5">
            {colors.slice(0, 5).map((color, index) => (
              <span
                key={index}
                className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-neutral-900">{name}</h3>
          {badge && (
            <span className="inline-flex items-center rounded-full border border-[#b70038]/20 bg-[#b70038]/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-[#7a0025]">
              {badge}
            </span>
          )}
        </div>

        <div className="text-sm font-semibold text-neutral-900">
          {currency.format(price)}
        </div>
      </div>
      <button
        className="btn btn-primary w-full mt-2"
        onClick={onAdd}
        disabled={loading}
      >
        {loading ? "Adding…" : "Add to cart"}
      </button>
      {message && <div className="mt-1 text-xs text-[var(--muted)]">{message}</div>}
    </article>
  );
}
