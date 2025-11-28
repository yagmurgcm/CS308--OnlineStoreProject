"use client";

import { useState } from "react";

import { useWishlist } from "@/store/wishlistContext";

import AddToCartButton from "./AddToCartButton";

type ProductCardProps = {
  productId: number;
  title: string;
  price: number;
  img?: string;
  className?: string;
  color?: string;
  size?: string;
};

export default function ProductCard({
  productId,
  title,
  price,
  img,
  className = "",
  color,
  size,
}: ProductCardProps) {
  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);   // ✔ DOĞRU YERİ BURASI

  const image = img ?? "/images/1.jpg";
  const product = {
    productId,
    quantity: 1,
    name: title,
    price,
    image,
    color,
    size,
  };

  const handleAddToWishlist = () => {
  setIsInWishlist(true);

  // animasyon bittikten sonra normale dönsün
  setTimeout(() => setIsInWishlist(false), 400);

  addItemToWishlist({
    id: String(productId),
    productId,
    name: title,
    price,
    image,
    color,
    size,
  });
};


  return (
    <div
  className={`group relative flex-none border border-[var(--line)] rounded-lg p-4 bg-white snap-start space-y-3 ${className}`}
>

  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    handleAddToWishlist();
  }}
  className={`absolute z-20 right-2 top-2 flex h-9 w-9 items-center justify-center
              rounded-full bg-white shadow-md cursor-pointer
              transition-all duration-300 
              opacity-0 group-hover:opacity-100
              ${isInWishlist ? "scale-150 text-red-500" : "scale-100 text-gray-700"}`}
>
  {isInWishlist ? "💖" : "🤍"}
</button>



      <div
        className="aspect-[3/4] rounded-md border border-[var(--line)] bg-cover bg-center"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="font-medium">{`\u20BA${price.toFixed(2)}`}</div>
      <AddToCartButton
        product={product}
      />
    </div>
  );
}
