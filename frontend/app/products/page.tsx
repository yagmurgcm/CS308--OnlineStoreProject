"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CART_AUTH_ERROR, useCart } from "@/lib/cart-context";

type Product = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
};

const fmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export default function ProductsPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      setActionError("");
      try {
        const data = await api.get<Product[]>("/products");
        setProducts(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function addToCart(productId: number) {
    try {
      setActionError("");
      setAddingId(productId);
      await addItem({ productId, quantity: 1 });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add to cart";
      if (message === CART_AUTH_ERROR) {
        router.push("/sign-in");
        return;
      }
      setActionError(message);
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <main className="container-base py-10">
        <p>Loading products...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container-base py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }

  return (
    <main className="container-base py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/cart" className="underline">
          Go to cart
        </Link>
      </div>

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <>
          {actionError && (
            <p className="text-sm text-red-600" role="alert">
              {actionError}
            </p>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const price =
                typeof p.price === "string" ? parseFloat(p.price) : p.price || 0;
              const image = p.image || p.imageUrl || "/images/1.jpg";
              return (
                <article
                  key={p.id}
                  className="rounded-lg border border-[var(--line)] bg-white p-4 space-y-3"
                >
                  <div className="relative aspect-[3/2] rounded-md overflow-hidden border border-[var(--line)] bg-[var(--background)]">
                    <Image src={image} alt={p.name} fill className="object-cover" />
                  </div>
                  <div className="text-sm text-neutral-500">{p.name}</div>
                  <div className="font-semibold">{fmt.format(price)}</div>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => addToCart(p.id)}
                    disabled={addingId === p.id}
                  >
                    {addingId === p.id ? "Adding..." : "Add to cart"}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
