"use client";

import { useState } from "react";
import Image from "next/image"; // 🔥 Image kullanmak daha performanslı
import Link from "next/link";   // 🔥 Tıklama özelliği için bu şart
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

// Hata veren dosyanın en üstüne ekle:
const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

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
  const [isInWishlist, setIsInWishlist] = useState(false);

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
    <div className={`group relative flex-none border border-[var(--line)] rounded-lg p-4 bg-white snap-start space-y-3 ${className}`}>
      
      {/* KALP BUTONU (Link dışı) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
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

      {/* 🔥 1. RESMİ LİNKE ALIYORUZ */}
      <Link href={`/products/${productId}`} className="block relative aspect-[3/4] rounded-md overflow-hidden border border-[var(--line)] bg-[var(--background)]">
          {/* Next.js Image Component'i kullanmak daha iyi */}
          <Image 
             src={image} 
             alt={title} 
             fill 
             className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
      </Link>

      <div className="space-y-1">
         {/* 🔥 2. BAŞLIĞI LİNKE ALIYORUZ */}
         <Link href={`/products/${productId}`} className="block">
            <div className="text-sm text-[var(--muted)] hover:underline hover:text-black cursor-pointer truncate">
               {title}
            </div>
         </Link>
         
          <div className="font-medium">{priceFormatter.format(price)}</div>      </div>

    </div>
  );
}