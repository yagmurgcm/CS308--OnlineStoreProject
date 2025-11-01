"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type ProductCardProps = {
  title: string;
  price: number;
  img?: string;
  className?: string;
  productId?: number; // varsa gerçek ürüne sepete ekleme yapılır
};

export default function ProductCard({
  title,
  price,
  img,
  className = "",
  productId,
}: ProductCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onAdd() {
    if (!productId) return;
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      router.push("/sign-in");
      return;
    }
    try {
      setLoading(true);
      setMessage("");
      await api.post("/cart/items", { productId, quantity: 1 });
      setMessage("Added to cart");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 1500);
    }
  }

  return (
    <div className={`flex-none border border-[var(--line)] rounded-lg p-4 bg-white snap-start ${className}`}>
      <div
        className="aspect-[3/4] rounded-md mb-3 border border-[var(--line)] bg-cover bg-center"
        style={{ backgroundImage: `url('${img ?? "/images/1.jpg"}')` }}
      />
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="font-medium">{`\u20BA${price.toFixed(2)}`}</div>
      {productId ? (
        <button className="btn btn-primary w-full mt-3" onClick={onAdd} disabled={loading}>
          {loading ? "Adding…" : "Add to cart"}
        </button>
      ) : null}
      {message && <div className="mt-2 text-xs text-[var(--muted)]">{message}</div>}
    </div>
  );
}
