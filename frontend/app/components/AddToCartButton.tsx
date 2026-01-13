"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CART_AUTH_ERROR, CartItemInput, useCart } from "@/lib/cart-context";
import Toast from "@/app/components/Toast";

type AddToCartButtonProps = {
  product: CartItemInput;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCartButton({
  product,
  className = "",
  children,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastId, setToastId] = useState(0);

  // 🔥 DÜZELTME BURADA: (e: React.MouseEvent) parametresini ekledik
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // 🛑 KRİTİK KOMUTLAR:
    e.preventDefault();  // Sayfanın yenilenmesini veya linkin çalışmasını engeller
    e.stopPropagation(); // Tıklamanın kartın üzerindeki Link'e sıçramasını engeller

    setLoading(true);
    try {
      await addItem(product);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1000);
      setToastId((current) => current + 1);
    } catch (error) {
      if (error instanceof Error && error.message === CART_AUTH_ERROR) {
        router.push("/sign-in");
        return;
      }
      console.error("Add to cart failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toastId > 0 && (
        <Toast
          key={toastId}
          message="Added to cart."
          type="success"
          onDismiss={() => setToastId(0)}
          durationMs={2500}
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        className={className || "btn btn-primary w-full text-sm"}
        aria-live="polite"
        disabled={loading}
      >
        {loading ? "Adding..." : justAdded ? "Added!" : (children || "Add to cart")}
      </button>
    </>
  );
}
