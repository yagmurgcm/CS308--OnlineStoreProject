"use client";

import { useState } from "react";
import { CartItemInput, useCart } from "@/lib/cart-context";

type AddToCartButtonProps = {
  product: CartItemInput;
  className?: string;
};

export default function AddToCartButton({
  product,
  className = "",
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = () => {
    addItem(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn btn-primary w-full text-sm ${className}`}
      aria-live="polite"
    >
      {justAdded ? "Added!" : "Add to cart"}
    </button>
  );
}
