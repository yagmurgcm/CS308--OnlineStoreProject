"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type Product = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  imageUrl?: string | null;
};

const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const signedIn = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("token");
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.get<Product[]>("/products");
        setProducts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function addToCart(productId: number) {
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    try {
      setAddingId(productId);
      await api.post("/cart/items", { productId, quantity: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <main className="container-base py-10">
        <p>Loading products…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-base py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="container-base py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/cart" className="underline">Go to cart</Link>
      </div>

      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const price = typeof p.price === "string" ? parseFloat(p.price) : p.price;
            return (
              <article key={p.id} className="rounded-lg border border-[var(--line)] bg-white p-4 space-y-3">
                <div className="relative aspect-[3/2] rounded-md overflow-hidden border border-[var(--line)] bg-[var(--background)]">
                  <Image
                    src={p.imageUrl || "/images/1.jpg"}
                    alt={p.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-sm text-neutral-500">{p.name}</div>
                <div className="font-semibold">{fmt.format(price || 0)}</div>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => addToCart(p.id)}
                  disabled={addingId === p.id}
                >
                  {addingId === p.id ? "Adding…" : "Add to cart"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

