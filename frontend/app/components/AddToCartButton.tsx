"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CART_AUTH_ERROR, CartItemInput, useCart } from "@/lib/cart-context";

type AddToCartButtonProps = {
  product: CartItemInput;
  className?: string;
};

export default function AddToCartButton({
  product,
  className = "",
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await addItem(product);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1000);
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
    <button
      type="button"
      onClick={handleClick}
      className={`btn btn-primary w-full text-sm ${className}`}
      aria-live="polite"
      disabled={loading}
    >
      {loading ? "Adding..." : justAdded ? "Added!" : "Add to cart"}
    </button>
  );
}
