import { api } from "./api";

export type ProductDto = {
  id: number;
  name: string;
  price: number | string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
};

export type ProductRecord = {
  id: number;
  name: string;
  price: number;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  image: string;
};

const FALLBACK_IMAGE = "/images/1.jpg";

const COLOR_PRESETS: string[][] = [
  ["#403d39", "#e0dcd2", "#b08d57"],
  ["#1f2327", "#cad2c5", "#84a98c"],
  ["#5c4b51", "#f2e9e4", "#9a8c98"],
  ["#2f3e46", "#cad2c5", "#84a98c"],
  ["#4a4e69", "#f2e9e4", "#c9ada7"],
  ["#3d2b1f", "#e4d4c8", "#a27b5c"],
  ["#1c1c1c", "#d4d4d4", "#a68a64"],
  ["#2d3142", "#bfc0c0", "#ef8354"],
];

export function normalizeProduct(product: ProductDto): ProductRecord {
  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price ?? 0;
  return {
    id: product.id,
    name: product.name,
    price: Number.isFinite(price) ? price : 0,
    category: product.category,
    subcategory: product.subcategory,
    description: product.description,
    image: product.image || product.imageUrl || product.thumbnail || FALLBACK_IMAGE,
  };
}

export async function fetchProducts(): Promise<ProductRecord[]> {
  const data = await api.get<ProductDto[]>("/products");
  return data.map(normalizeProduct);
}

export function getPalette(productId: number): string[] {
  const preset = COLOR_PRESETS[productId % COLOR_PRESETS.length];
  return preset ?? COLOR_PRESETS[0];
}

export function pickBadge(index: number): string | undefined {
  if (index < 3) return "New in";
  if (index % 5 === 0) return "Best seller";
  return undefined;
}
