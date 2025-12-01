import Image from "next/image";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
// Sağ tarafı yöneten bileşeni çağırıyoruz
import ProductRightSide from "../../components/ProductRightSide"; 
// Yorum bileşenini çağırıyoruz
import ProductReviews from "../../components/product/product-reviews";

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

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  let product: Product | null = null;

  try {
    if (!id) throw new Error("ID eksik");
    product = await api.get<Product>(`/products/${id}`);
  } catch (error) {
    console.error("❌ API HATASI:", error);
  }

  if (!product) {
    return notFound();
  }

  // --- RENK VE BEDENLERİ ELLE EKLİYORUZ Kİ GÖRÜNSÜN ---
  product.mockColors = ["Dark Grey", "Black", "Off White", "Beige"];
  product.mockSizes = ["XS", "S", "M", "L", "XL", "XXL"];
  // ----------------------------------------------------

  const image = product.image || product.imageUrl || "/images/1.jpg";

  return (
    <div className="container-base py-10 md:py-16 bg-white min-h-screen">
      
      {/* --- ÜST KISIM: IZGARA (GRID) YAPISI --- 
          Sol: Resim, Sağ: Detaylar
      */}
      <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] lg:gap-16 items-start">
        
        {/* --- SOL TARAF (RESİM) --- */}
        <div className="relative w-full md:sticky md:top-24">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-50 border border-gray-100 rounded-sm">
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

        {/* --- SAĞ TARAF (DETAYLAR) --- */}
        <ProductRightSide product={product} />

      </div> {/* Grid burada bitiyor */}

      {/* --- ALT KISIM: YORUMLAR --- 
          Grid bittikten sonra buraya ekliyoruz.
          Böylece resim ve detayın altına iniyor.
      */}
      <div className="mt-10">
        <ProductReviews productId={product.id} />
      </div>

    </div> // Ana container burada bitiyor
  );
}