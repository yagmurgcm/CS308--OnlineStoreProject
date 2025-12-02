"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react"; 
import { useWishlist } from "@/store/wishlistContext";

// 👇 TİP TANIMI (TAPU) BURASI - BURAYI GÜNCELLEMEZSEN HATA GİTMEZ
export type CategoryProduct = {
  id: string;
  productId: number;
  name: string;
  price: number;
  image: string;
  colors?: string[];
  badge?: string;
  subcategory?: string | null;
  // 👇 BU İKİ SATIR EKLENMEZSE TYPESCRIPT KIZAR!
  averageRating?: number | string;
  reviewCount?: number;
};

const formatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function CategoryProductCard({
  product,
}: {
  product: CategoryProduct;
}) {
  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Puanı güvenli sayıya çevir
  const ratingValue = Number(product.averageRating || 0);

  const handleAddToWishlist = () => {
    setIsInWishlist(true);
    setTimeout(() => setIsInWishlist(false), 400);
    addItemToWishlist({
      id: String(product.productId),
      productId: product.productId,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-white p-3 transition-all hover:shadow-md">
      {/* Kalp Butonu */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleAddToWishlist();
        }}
        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 ${
          isInWishlist ? "scale-110 text-red-500" : "text-neutral-400 hover:text-red-500"
        }`}
      >
        {isInWishlist ? "💖" : "🤍"}
      </button>

      {/* Resim */}
      <Link href={`/products/${product.productId}`} className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-neutral-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-900 shadow-sm backdrop-blur-sm">
            {product.badge}
          </span>
        )}
      </Link>

      {/* Bilgiler */}
      <div className="flex flex-col gap-1">
        <Link href={`/products/${product.productId}`}>
          <h3 className="text-sm font-medium leading-tight text-neutral-900 line-clamp-2 hover:underline">
            {product.name}
          </h3>
        </Link>
        
        {/* ⭐ YILDIZLAR ⭐ */}
        <div className="flex items-center gap-1 mt-1 min-h-[16px]">
        {ratingValue > 0 ? (
          <>
             <span className="text-xs font-bold text-gray-800">
                {ratingValue.toFixed(1)}
             </span>
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
             <span className="text-[10px] text-gray-500">({product.reviewCount})</span>
          </>
        ) : (
          <div className="h-4"></div>
        )}
        </div>

        <div className="mt-1 font-semibold text-neutral-900">
          {formatter.format(product.price)}
        </div>
        
        {/* Renkler */}
        {product.colors && product.colors.length > 0 && (
          <div className="mt-2 flex gap-1">
            {product.colors.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: c }}
              />
            ))}
            {product.colors.length > 4 && (
              <span className="text-[10px] text-neutral-400">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}