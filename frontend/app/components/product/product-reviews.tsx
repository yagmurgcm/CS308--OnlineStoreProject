"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, User, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Review = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
  };
};

export default function ProductReviews({ productId }: { productId: number }) {
  const { user } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [canReview, setCanReview] = useState(false);

  // 1. Yorumları Backend'den Çek
  const fetchReviews = useCallback(async () => {
    try {
      const data = await api.get<Review[]>(`/reviews/${productId}`);
      setReviews(data || []);
    } catch (error) {
      console.error("Yorumlar çekilemedi:", error);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
    if (user) setCanReview(true); 
  }, [user, fetchReviews]);

  // 2. Yorum Gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRating === 0) return;

    setIsSubmitting(true);
    try {
      await api.post("/reviews", {
        productId: Number(productId), 
        rating: Number(userRating),
        comment: userComment
      });
      
      setSubmitStatus("success");
      setUserComment("");
      setUserRating(0);
      // Yorum gönderdikten sonra listeyi yenilemeyelim çünkü onay bekliyor olacak
    } catch (error) {
      console.error("Yorum gönderilemedi:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 🔥 KRİTİK KISIM: RETURN BURADA BAŞLIYOR ---
  return (
    <section className="mt-16 border-t border-neutral-200 pt-10">
      <h2 className="text-2xl font-semibold mb-6">Müşteri Değerlendirmeleri</h2>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* SOL TARAFI: Yorum Listesi */}
        <div className="space-y-6">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-neutral-100 pb-6 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                    <User size={16} />
                  </div>
                  <span className="font-medium text-sm">{review.user?.name || "Kullanıcı"}</span>
                  <span className="text-xs text-neutral-400">
                    • {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                
                <div className="flex mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-300"}
                    />
                  ))}
                </div>
                
                <p className="text-neutral-600 text-sm leading-relaxed">
                  {review.comment}
                </p>
              </div>
            ))
          ) : (
            <p className="text-neutral-500">Bu ürün için henüz onaylı yorum yok.</p>
          )}
        </div>

        {/* SAĞ TARAF: Yorum Yapma Formu */}
        <div className="bg-neutral-50 p-6 rounded-xl h-fit">
          <h3 className="text-lg font-medium mb-4">Değerlendirme Yap</h3>

          {!user ? (
            <div className="flex flex-col items-center justify-center text-center py-6 text-neutral-500">
              <Lock className="mb-2 opacity-50" />
              <p className="text-sm">Yorum yapmak için giriş yapmalısınız.</p>
            </div>
          ) : submitStatus === "success" ? (
             <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                    <CheckCircle className="text-green-600" />
                </div>
                <h4 className="text-green-800 font-medium">Teşekkürler!</h4>
                <p className="text-green-700 text-sm mt-1">
                    Puanınız kaydedildi. Yorumunuz yönetici onayından sonra yayınlanacaktır.
                </p>
                <button 
                    onClick={() => setSubmitStatus("idle")}
                    className="mt-4 text-xs text-green-800 underline hover:text-green-900"
                >
                    Yeni yorum yaz
                </button>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitStatus === "error" && (
                 <p className="text-red-500 text-sm">Bir hata oluştu. Lütfen tekrar deneyin.</p>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Puanınız
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={24}
                        className={
                          star <= (hoveredStar || userRating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-neutral-300"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-neutral-700 mb-1">
                  Yorumunuz
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Ürün hakkında deneyimlerinizi paylaşın..."
                  className="w-full rounded-md border border-neutral-300 p-3 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={userRating === 0 || isSubmitting}
                className="w-full bg-black text-white py-2.5 rounded-md font-medium text-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}