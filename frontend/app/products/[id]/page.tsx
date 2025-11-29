import Image from "next/image";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
// Sağ tarafı yöneten bileşeni çağırıyoruz
import ProductRightSide from "../../components/ProductRightSide"; 

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
      
      {/* --- IZGARA (GRID) YAPISI --- 
          md:grid-cols-[1.5fr_1fr] -> Sol taraf geniş, Sağ taraf dar olsun.
          gap-10 -> Aralarında boşluk olsun.
      */}
      <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] lg:gap-16 items-start">
        
        {/* --- SOL TARA (RESİM) --- */}
        <div className="relative w-full md:sticky md:top-24">
          {/* aspect-[4/5] -> Dikdörtgen resim formatı */}
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

      </div>
    </div>
  );
}