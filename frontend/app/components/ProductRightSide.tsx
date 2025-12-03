"use client";

import { useState, useEffect, useMemo } from "react";
import { Star } from "lucide-react";
import AddToCartButton from "../components/AddToCartButton";
import { useWishlist } from "@/store/wishlistContext";

type ProductVariant = {
  id: number;     // DB'den gelen id
  size: string;
  color: string;
  stock: number;
  price?: number; // Varyant bazlı fiyat olabilir
};

type Product = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  stock?: number;
  variants?: ProductVariant[];
  averageRating?: number | string;
  reviewCount?: number;
};

const fmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function ProductRightSide({ product }: { product: Product }) {
  // Rating value
  const ratingValue = Number(product.averageRating || 0);
  const reviewCount = product.reviewCount || 0;

  // 1. ADIM: Varyantlardan Renk ve Beden Listesini Çıkar (Dinamik)
  const variants = product.variants || [];

  // Mevcut tüm renkleri bul (Tekrar edenleri temizle)
  const availableColors = useMemo(() => {
    const colors = variants.map((v) => v.color).filter(Boolean);
    return Array.from(new Set(colors)); // Unique yap
  }, [variants]);

  // Mevcut tüm bedenleri bul (Tekrar edenleri temizle)
  const availableSizes = useMemo(() => {
    const sizes = variants.map((v) => v.size).filter(Boolean);
    return Array.from(new Set(sizes)); // Unique yap
  }, [variants]);

  // Varsayılan seçimleri yap (Listenin ilk elemanını seç)
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Sayfa ilk yüklendiğinde otomatik ilk renk ve bedeni seç
 // Sayfa ilk yüklendiğinde otomatik ilk renk ve bedeni seç
  useEffect(() => {
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
    if (availableSizes.length > 0 && !selectedSize) {
      // Hatalı satır silindi, sadece bu kalmalı:
      setSelectedSize(availableSizes[0]);
    }
  }, [availableColors, availableSizes]); // Dependency array'i de bu şekilde sadeleştirebilirsin

  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Seçili varyantı bul
  const selectedVariant = variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );

  // Stok ve Fiyat Belirle
  // Eğer varyant bulunduysa onun stoğunu, bulunamadıysa 0 al.
  const currentStock = selectedVariant ? selectedVariant.stock : 0;
  // Eğer varyantın özel fiyatı varsa onu kullan, yoksa ana ürün fiyatını kullan
  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : (typeof product.price === "string" ? parseFloat(product.price) : product.price || 0);
  
  const isOutOfStock = currentStock === 0;
  const image = product.image || product.imageUrl || "/images/1.jpg";

  const handleQuantityChange = (val: number) => {
    if (val < 1) return;
    if (!isOutOfStock && val > currentStock) return; 
    setQuantity(val);
  };

  // Renk veya beden değişince quantity'i resetle veya düzelt
  useEffect(() => {
    if (quantity > currentStock && currentStock > 0) setQuantity(currentStock);
    if (currentStock === 0) setQuantity(1);
  }, [selectedVariant, currentStock]);

  const handleAddToWishlist = () => {
    setIsInWishlist(true);
    setTimeout(() => setIsInWishlist(false), 400);
    addItemToWishlist({
      id: String(product.id),
      productId: product.id,
      name: product.name,
      price: currentPrice,
      image: image,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
  };

  return (
    <div className="flex flex-col font-sans text-[#1b1b1b] pt-2">
      
      <h1 className="text-4xl font-medium tracking-tight mb-2 text-black">{product.name}</h1>
      
      {/* ⭐ RATING & REVIEW COUNT */}
      <div className="flex items-center gap-2 mb-4">
        {/* Rating Number */}
        <span className="text-lg font-bold text-gray-900">
          {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
        </span>

        {/* Stars */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={18}
              className={`${
                star <= Math.round(ratingValue)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Review Count */}
        <span className="text-sm text-gray-500">
          ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Product ID: {product.id}</p>

      <div className="flex flex-col mb-8">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold">{fmt.format(currentPrice)}</span>
          <span className="text-[10px] font-bold border border-[#fa0000] text-[#fa0000] px-1.5 py-0.5 uppercase tracking-wider">
            New In
          </span>
        </div>
        
        {/* STOK BİLGİSİ */}
        <div className="mt-2 text-sm transition-all duration-300">
             {/* Varyant seçili değilse veya stok yoksa */}
             {!selectedVariant || isOutOfStock ? (
                <span className="text-red-600 font-bold">⚠️ Out of Stock</span>
             ) : (
                <span className="text-green-700 font-medium">
                   ✅ In Stock: <span className="font-bold text-lg">{currentStock}</span> items left
                </span>
             )}
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-8">
        {product.description || "A timeless classic designed for everyday comfort."}
      </p>

      <div className="w-full h-px bg-gray-200 mb-8"></div>

      {/* RENK SEÇİMİ (Database'den gelenler) */}
      {availableColors.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-bold mb-3">
            Colour: <span className="font-normal text-gray-600 ml-1">{selectedColor}</span>
          </p>
          <div className="flex gap-3 flex-wrap">
            {availableColors.map((color) => {
              // Rengi CSS uyumlu hale getir (örn: "Navy Blue" -> "navy")
              // Basit bir mapleme veya direkt hex kodu backendden geliyorsa o kullanılabilir
              // Şimdilik ismi kullanıyoruz
              const isActive = selectedColor === color;
              
              // CSS için basit renk dönüşümü (Geliştirilebilir)
              let bg = color.toLowerCase().replace(/\s/g, '');
              if (bg === 'stone') bg = '#D2B48C'; // Örnek manuel düzeltme
              
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`h-10 px-4 min-w-[3rem] rounded-md border text-sm font-medium transition-all
                    ${isActive 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'}`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BEDEN SEÇİMİ (Database'den gelenler) */}
      {availableSizes.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-end mb-3">
             <p className="text-sm font-bold">Size: <span className="font-normal text-gray-600 ml-1">{selectedSize}</span></p>
             <button className="text-xs text-gray-500 underline decoration-gray-400">Size Chart</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`h-12 w-14 flex items-center justify-center text-sm font-medium border transition-colors
                  ${selectedSize === size 
                    ? 'border-black bg-black text-white' 
                    : 'border-gray-300 bg-white text-gray-900 hover:border-black'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show warning if no variants exist */}
      {variants.length === 0 && (
        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm mb-6 rounded">
            No variant (size/color) information found for this product. Please contact the administrator.
        </div>
      )}

      {/* ADET SEÇİMİ */}
      <div className="mb-8">
        <p className="text-sm font-bold mb-3">Quantity</p>
        <div className={`flex w-[140px] h-12 border border-gray-300 ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => handleQuantityChange(quantity - 1)} className="w-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xl">-</button>
          <div className="flex-1 flex items-center justify-center font-medium text-lg">{quantity}</div>
          <button onClick={() => handleQuantityChange(quantity + 1)} className="w-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xl">+</button>
        </div>
      </div>

      {/* BUTONLAR */}
      <div className="space-y-4">
        <div className={isOutOfStock ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}>
            <AddToCartButton
                product={{
                    productId: product.id,
                    name: product.name,
                    price: currentPrice,
                    image: image,
                    quantity: quantity,
                    color: selectedColor || undefined,
                    size: selectedSize || undefined
                }}
                className={`w-full h-14 text-base font-bold tracking-widest uppercase transition-colors rounded-sm text-white
                    ${isOutOfStock ? 'bg-gray-400' : 'bg-[#1b1b1b] hover:bg-black'}`}
            >
                {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
            </AddToCartButton>
        </div>
        
        <div className="flex justify-end pt-2">
            <button 
                onClick={handleAddToWishlist}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors py-2 px-4 border border-transparent hover:border-gray-200"
            >
            <span className={`text-xl ${isInWishlist ? 'text-red-600' : 'text-gray-400'}`}>
                {isInWishlist ? "♥" : "♡"}
            </span>
            <span className="underline underline-offset-4">Add to Wishlist</span>
            </button>
        </div>
      </div>
    </div>
  );
}