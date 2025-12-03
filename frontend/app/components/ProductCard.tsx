"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/store/wishlistContext";
import { Star } from "lucide-react";

type ProductCardProps = {
  productId: number;
  title: string;
  price: number;
  img?: string;
  className?: string;
  color?: string;
  size?: string;
  averageRating?: number | string;
  reviewCount?: number;
};

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
  averageRating,
  reviewCount,
}: ProductCardProps) {
  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);

  const image = img ?? "/images/1.jpg";
  
  // Puanı sayıya çevir
  const ratingValue = Number(averageRating || 0);

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
    <div className={`group relative flex-none border border-[var(--line)] rounded-lg p-3 bg-white snap-start space-y-2 ${className}`}>
      
      {/* KALP BUTONU */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddToWishlist();
        }}
        className={`absolute z-20 right-2 top-2 flex h-8 w-8 items-center justify-center
              rounded-full bg-white shadow-sm border border-gray-100 cursor-pointer
              transition-all duration-300 
              ${isInWishlist ? "scale-110 text-red-500" : "text-gray-400 hover:text-red-500"}`}
      >
        {isInWishlist ? "💖" : "🤍"}
      </button>

      {/* RESİM */}
      <Link href={`/products/${productId}`} className="block relative aspect-[3/4] w-full rounded-md overflow-hidden bg-gray-50">
          <Image 
             src={image} 
             alt={title} 
             fill 
             className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
      </Link>

      <div className="flex flex-col gap-1">
          {/* BAŞLIK */}
          <Link href={`/products/${productId}`} className="block">
            <div className="text-sm text-gray-700 font-medium leading-tight line-clamp-2 min-h-[2.5rem]" title={title}>
               {title}
            </div>
          </Link>
          
          {/* ⭐ TRENDYOL TARZI YILDIZ ALANI ⭐ */}
          {/* Test için ratingValue > 0 şartını kaldırdım, her türlü görünsün */}
          <div className="flex items-center gap-1 mt-1">
            {/* 1. Puan Yazısı (Örn: 4.3) */}
            <span className="text-xs font-bold text-gray-800">
              {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
            </span>

            {/* 2. Yıldızlar */}
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={10} 
                  className={`${
                    star <= Math.round(ratingValue)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* 3. Yorum Sayısı (Örn: (6303)) */}
            <span className="text-[10px] text-gray-500">
              ({reviewCount || 0})
            </span>
          </div>
          
          {/* FİYAT */}
          <div className="text-sm font-semibold text-black-600 mt-1">
            {priceFormatter.format(price)}
          </div>      
      </div>
    </div>
  );
}