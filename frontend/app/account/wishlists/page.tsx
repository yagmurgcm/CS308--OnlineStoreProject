"use client";

import { useWishlist } from "@/store/wishlistContext";

export default function WishlistsPage() {
  const { wishlist, removeItemFromWishlist } = useWishlist();

  // EMPTY STATE
  if (wishlist.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6">Wishlists</h1>

        <div className="text-center py-20">
          <h2 className="text-xl font-semibold">Your wishlist is empty 🖤</h2>
          <p className="text-gray-500 mt-2">Start adding products you love!</p>
        </div>
      </div>
    );
  }

  // NON-EMPTY STATE
  return (
    <div className="p-4 space-y-6 max-w-4xl">
      {/* Wishlist başlığı */}
      <h1 className="text-2xl font-semibold">Wishlists</h1>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {wishlist.map((item) => (
          <div key={item.id} className="border rounded-md p-3 bg-white relative">
            <button
              onClick={() => removeItemFromWishlist(item.id)}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            >
              🗑️
            </button>

            <div
              className="aspect-[3/4] bg-cover bg-center rounded-md mb-3"
              style={{ backgroundImage: `url('${item.image}')` }}
            />

            <div className="text-sm text-gray-700">{item.name}</div>
            <div className="font-semibold">₺{item.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
