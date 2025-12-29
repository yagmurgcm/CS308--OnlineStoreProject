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
  averageRating?: number | string;
  reviewCount?: number;
  discountRate?: number | string | null;
  discountedPrice?: number | string | null;
};

export type ProductRecord = {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  discountRate?: number | null;
  discountedPrice?: number | null;
  hasDiscount: boolean;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  image: string;
  averageRating?: number | string;
  reviewCount?: number;
};

export type PricingDetails = {
  originalPrice: number;
  discountRate: number;
  discountedPrice: number | null;
  finalPrice: number;
  hasDiscount: boolean;
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

export const normalizeMoney = (
  value: number | string | null | undefined,
): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function resolvePricing(
  basePrice: number | string | null | undefined,
  discountRate?: number | string | null,
  discountedPrice?: number | string | null,
): PricingDetails {
  const originalPrice = normalizeMoney(basePrice);
  const parsedRate = normalizeMoney(discountRate as number | string | null);
  const rate = parsedRate > 0 ? parsedRate : 0;
  const normalizedDiscounted =
    discountedPrice === null || discountedPrice === undefined
      ? null
      : normalizeMoney(discountedPrice);

  const computedDiscounted =
    rate > 0 ? Number((originalPrice * (1 - rate / 100)).toFixed(2)) : null;

  const effectiveDiscounted =
    normalizedDiscounted !== null ? normalizedDiscounted : computedDiscounted;

  const hasDiscount =
    effectiveDiscounted !== null && effectiveDiscounted < originalPrice;

  return {
    originalPrice,
    discountRate: rate,
    discountedPrice: hasDiscount ? effectiveDiscounted! : null,
    finalPrice: hasDiscount ? effectiveDiscounted! : originalPrice,
    hasDiscount,
  };
}

export function normalizeProduct(product: ProductDto): ProductRecord {
  const pricing = resolvePricing(
    product.price,
    product.discountRate,
    product.discountedPrice,
  );

  return {
    id: product.id,
    name: product.name,
    price: pricing.finalPrice,
    originalPrice: pricing.originalPrice,
    discountRate: pricing.discountRate,
    discountedPrice: pricing.discountedPrice,
    hasDiscount: pricing.hasDiscount,
    category: product.category,
    subcategory: product.subcategory,
    description: product.description,
    image: product.image || product.imageUrl || product.thumbnail || FALLBACK_IMAGE,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
  };
}

type PagedProductsResponse = {
  items?: ProductDto[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

const toProductList = (
  data: ProductDto[] | PagedProductsResponse | null | undefined,
): ProductDto[] => {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
};

export async function fetchProducts(options?: { limit?: number }): Promise<ProductRecord[]> {
  const limit = options?.limit ?? 100;
  const query = limit ? `?limit=${limit}` : "";

  const data = await api.get<ProductDto[] | PagedProductsResponse>(
    `/products${query}`,
    { cache: "no-store", next: { revalidate: 0 } },
  );
  const list = toProductList(data);
  return list.map(normalizeProduct);
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

export async function fetchProductById(id: string | number) {
  const allProducts = await fetchProducts();
  const product = allProducts.find((p) => String(p.id) === String(id));
  return product || null;
}

export async function searchProducts(query: string): Promise<ProductRecord[]> {
  const term = query.trim();
  if (!term) return [];

  const data = await api.get<ProductDto[] | PagedProductsResponse>(
    `/products?search=${encodeURIComponent(term)}&limit=100`,
    { cache: "no-store", next: { revalidate: 0 } },
  );
  return toProductList(data).map(normalizeProduct);
}
