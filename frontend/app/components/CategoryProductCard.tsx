"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link"; // <--- 1. BUNU MUTLAKA EKLE
import AddToCartButton from "./AddToCartButton"; // Yolunu düzelttik
import { useWishlist } from "@/store/wishlistContext";

export type CategoryProduct = {
  id: string;
  productId: number;
  name: string;
  price: number;
  image: string;
  colors?: string[];
  badge?: string;
};

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function CategoryProductCard({
  product,
}: {
  product: CategoryProduct;
}) {
  const { name, price, image, colors = [], badge, productId } = product;

  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);

  const handleAddToWishlist = () => {
    setIsInWishlist(true);
    setTimeout(() => setIsInWishlist(false), 400);
    addItemToWishlist({
      id: String(productId),
      productId,
      name,
      price,
      image,
      color: colors.length > 0 ? colors[0] : undefined,
    });
  };

  return (
    <article className="group space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="relative aspect-[3/4]">
          
          {/* Kalp Butonu (Linkin dışında, üstte kalmalı) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Linke tıklamayı engeller
              e.stopPropagation(); // Olayın yukarı taşmasını engeller
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

          {/* 2. RESMİ LİNKE ALIYORUZ */}
          {/* Kullanıcı resme tıklarsa detay sayfasına gider */}
          <Link href={`/products/${productId}`} className="block w-full h-full">
            <Image
              src={image}
              alt={name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 28vw, (min-width: 768px) 45vw, 85vw"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              priority={false}
            />
          </Link>
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
          {/* 3. BAŞLIĞI DA LİNKE ALIYORUZ */}
          <Link href={`/products/${productId}`}>
             <h3 className="text-sm font-medium text-neutral-900 hover:underline cursor-pointer">
               {name}
             </h3>
          </Link>
          
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
      
      {/* Sepete Ekle Butonu (Linkin dışında kalmalı) */}
      <AddToCartButton
        product={{
          productId: product.productId,
          quantity: 1,
          name,
          price,
          image,
        }}
      />
    </article>
  );
}