"use client";

import { FormEvent, useState } from "react";

const CATEGORY_OPTIONS = {
  Women: ["Knitwear", "Coats & Jackets", "Shirts", "Accessories"],
  Men: ["Shirts", "Bottoms", "Accessories"],
  Beauty: ["Skincare", "Makeup", "Perfume"],
} as const;

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"] as const;

type CategoryKey = keyof typeof CATEGORY_OPTIONS;
type SizeOption = (typeof SIZE_OPTIONS)[number];

const CATEGORY_KEYS = Object.keys(CATEGORY_OPTIONS) as CategoryKey[];

type ProductForm = {
  name: string;
  category: CategoryKey | "";
  subcategory: string;
  price: string;
  stock: string;
  imageUrl: string;
  description: string;
  color: string;
  size: SizeOption | "";
};

export default function AdminPage() {
  const [form, setForm] = useState<ProductForm>({
    name: "",
    category: "",
    subcategory: "",
    price: "",
    stock: "",
    imageUrl: "",
    description: "",
    color: "",
    size: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ProductForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const subcategories = form.category ? CATEGORY_OPTIONS[form.category] : [];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requiredFields = {
      name: form.name.trim(),
      category: form.category,
      price: form.price.trim(),
      stock: form.stock.trim(),
      imageUrl: form.imageUrl.trim(),
    };

    const hasMissingRequired = Object.values(requiredFields).some(
      (value) => value === "" || value === undefined
    );

    const shouldSelectSubcategory =
      form.category !== "" && (CATEGORY_OPTIONS[form.category]?.length ?? 0) > 0;
    const isSubcategoryMissing = shouldSelectSubcategory && form.subcategory === "";

    if (hasMissingRequired || isSubcategoryMissing) {
      alert("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { description, color, size, price, stock, ...rest } = form;
      const payload: Record<string, unknown> = {
        ...rest,
        price: Number(price),
        stock: Number(stock),
      };

      if (description.trim()) {
        payload.description = description.trim();
      }

      if (color.trim()) {
        payload.color = color.trim();
      }

      if (size) {
        payload.size = size;
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      alert("Ürün eklendi");
      setForm({
        name: "",
        category: "",
        subcategory: "",
        price: "",
        stock: "",
        imageUrl: "",
        description: "",
        color: "",
        size: "",
      });
    } catch (error) {
      console.error(error);
      alert("Ürün eklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-base py-12">
      <div className="max-w-2xl mx-auto rounded-2xl border border-[var(--line)] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Admin Panel
          </p>
          <h1 className="text-2xl font-semibold">Yeni Ürün Ekle</h1>
          <p className="text-sm text-neutral-500">
            Mağazanıza hızlıca yeni ürünler eklemek için aşağıdaki formu doldurun.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-neutral-700">
              Ürün Adı
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="Örn. Wool Blend Coat"
                required
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Kategori
              <select
                value={form.category}
                onChange={(event) => {
                  const value = event.target.value as CategoryKey | "";
                  setForm((prev) => ({
                    ...prev,
                    category: value,
                    subcategory: "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                required
              >
                <option value="" disabled>
                  Kategori seçin
                </option>
                {CATEGORY_KEYS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {subcategories.length ? (
              <label className="text-sm font-medium text-neutral-700">
                Alt Kategori
                <select
                  value={form.subcategory}
                  onChange={(event) => handleChange("subcategory")(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                >
                  <option value="">Alt kategori seçin </option>
                  {subcategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="text-sm font-medium text-neutral-700">
              Fiyat (₺)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => handleChange("price")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="1499.90"
                required
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Stok
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => handleChange("stock")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="25"
                required
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Görsel URL
              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) => handleChange("imageUrl")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="https://"
                required
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Açıklama (opsiyonel)
              <textarea
                value={form.description}
                onChange={(event) => handleChange("description")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                rows={4}
                placeholder="Ürün hakkında kısa bir açıklama girin"
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Renk (opsiyonel)
              <input
                type="text"
                value={form.color}
                onChange={(event) => handleChange("color")(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="Örn. Camel"
              />
            </label>

            <label className="text-sm font-medium text-neutral-700">
              Beden (opsiyonel)
              <select
                value={form.size}
                onChange={(event) => handleChange("size")(event.target.value as SizeOption | "")}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              >
                <option value="">Beden seçin (opsiyonel)</option>
                {SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
      </div>
    </div>
  );
}
