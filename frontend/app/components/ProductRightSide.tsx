"use client";

import { useState } from "react";
import AddToCartButton from "../components/AddToCartButton";
import { useWishlist } from "@/store/wishlistContext";

type Product = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  stock?: number;
  mockColors?: string[];
  mockSizes?: string[];
};

const fmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function ProductRightSide({ product }: { product: Product }) {
  const [selectedColor, setSelectedColor] = useState<string | null>(product.mockColors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(product.mockSizes?.[2] || null);
  const [quantity, setQuantity] = useState(1);
  
  const { addItemToWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);

  const priceNum = typeof product.price === "string" ? parseFloat(product.price) : product.price || 0;
  const image = product.image || product.imageUrl || "/images/1.jpg";

  const handleQuantityChange = (val: number) => {
    if (val < 1) return;
    setQuantity(val);
  };

  const handleAddToWishlist = () => {
    setIsInWishlist(true);
    setTimeout(() => setIsInWishlist(false), 400);
    addItemToWishlist({
      id: String(product.id),
      productId: product.id,
      name: product.name,
      price: priceNum,
      image: image,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
  };

  return (
    <div className="flex flex-col font-sans text-[#1b1b1b] pt-2">
      
      <h1 className="text-4xl font-medium tracking-tight mb-2 text-black">{product.name}</h1>
      <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Product ID: {product.id}</p>

      <div className="flex items-center gap-4 mb-8">
        <span className="text-3xl font-bold">{fmt.format(priceNum)}</span>
        <span className="text-[10px] font-bold border border-[#fa0000] text-[#fa0000] px-1.5 py-0.5 uppercase tracking-wider">
          New In
        </span>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-8">
        {product.description || "A timeless classic designed for everyday comfort. Made with premium quality materials to ensure durability and style."}
      </p>

      <div className="w-full h-px bg-gray-200 mb-8"></div>

      {/* RENK */}
      {product.mockColors && (
        <div className="mb-6">
          <p className="text-sm font-bold mb-3">
            Colour: <span className="font-normal text-gray-600 ml-1">{selectedColor}</span>
          </p>
          <div className="flex gap-3">
            {product.mockColors.map((color) => {
              const bg = color.toLowerCase().replace(/\s/g, '');
              const isActive = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border border-gray-300 shadow-sm transition-all relative
                    ${isActive ? 'ring-2 ring-black ring-offset-2' : 'hover:border-gray-400'}`}
                  style={{ backgroundColor: bg === 'darkgrey' ? '#4a4a4a' : bg }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* BEDEN */}
      {product.mockSizes && (
        <div className="mb-8">
          <div className="flex justify-between items-end mb-3">
             <p className="text-sm font-bold">Size: <span className="font-normal text-gray-600 ml-1">{selectedSize}</span></p>
             <button className="text-xs text-gray-500 underline decoration-gray-400">Size Chart</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.mockSizes.map((size) => (
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

      {/* ADET */}
      <div className="mb-8">
        <p className="text-sm font-bold mb-3">Quantity</p>
        <div className="flex w-[140px] h-12 border border-gray-300">
          <button onClick={() => handleQuantityChange(quantity - 1)} className="w-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xl">-</button>
          <div className="flex-1 flex items-center justify-center font-medium text-lg">{quantity}</div>
          <button onClick={() => handleQuantityChange(quantity + 1)} className="w-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xl">+</button>
        </div>
      </div>

      {/* BUTONLAR */}
      <div className="space-y-4">
        <AddToCartButton
            product={{
                productId: product.id,
                name: product.name,
                price: priceNum,
                image: image,
                quantity: quantity,
                color: selectedColor || undefined,
                size: selectedSize || undefined
            }}
            className="w-full bg-[#1b1b1b] hover:bg-black text-white h-14 text-base font-bold tracking-widest uppercase transition-colors rounded-sm"
        >
            ADD TO CART
        </AddToCartButton>
        
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
