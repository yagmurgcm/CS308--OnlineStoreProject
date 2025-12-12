"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, User, Lock, CheckCircle, AlertCircle, ShoppingBag } from "lucide-react";
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
  const [userComment, setUserComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [ratingStatus, setRatingStatus] = useState<"idle" | "success" | "error">("idle");
  const [commentStatus, setCommentStatus] = useState<"idle" | "success" | "error">("idle");
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  // 1. Fetch reviews from Backend
  const fetchReviews = useCallback(async () => {
    try {
      const data = await api.get<Review[]>(`/reviews/${productId}`);
      setReviews(data || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  }, [productId]);

  // 2. Check if user has purchased this product
  const checkCanReview = useCallback(async () => {
    if (!user) {
      setCanReview(null);
      return;
    }
    setCheckingPurchase(true);
    try {
      const data = await api.get<{ canReview: boolean }>(`/reviews/can-review/${productId}`);
      setCanReview(data.canReview);
    } catch (error) {
      console.error("Failed to check purchase status:", error);
      setCanReview(false);
    } finally {
      setCheckingPurchase(false);
    }
  }, [productId, user]);

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [fetchReviews, checkCanReview]);

  // 2. Submit RATING only (yıldıza tıklayınca hemen gönder)
  const handleRatingClick = async (rating: number) => {
    if (!user) return;
    
    setIsSubmittingRating(true);
    setRatingStatus("idle");
    try {
      await api.post("/reviews", {
        productId: Number(productId), 
        rating: Number(rating),
        // comment yok - sadece rating
      });
      
      setRatingStatus("success");
      // 2 saniye sonra mesajı kaldır
      setTimeout(() => setRatingStatus("idle"), 2000);
      // Refresh the list
      await fetchReviews();
    } catch (error) {
      console.error("Failed to submit rating:", error);
      setRatingStatus("error");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // 3. Submit COMMENT only (form submit)
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim()) return;

    setIsSubmittingComment(true);
    setCommentStatus("idle");
    try {
      await api.post("/reviews", {
        productId: Number(productId), 
        rating: 0, // No rating for comment-only (backend will ignore it)
        comment: userComment
      });
      
      setCommentStatus("success");
      setUserComment("");
      // Refresh the list
      await fetchReviews();
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setCommentStatus("error");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // --- RETURN STARTS HERE ---
  return (
    <section className="mt-16 border-t border-neutral-200 pt-10">
      <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* LEFT SIDE: Review List */}
        <div className="space-y-6">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-neutral-100 pb-6 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                    <User size={16} />
                  </div>
                  <span className="font-medium text-sm">{review.user?.name || "User"}</span>
                  <span className="text-xs text-neutral-400">
                    • {new Date(review.createdAt).toLocaleDateString("en-US")}
                  </span>
                </div>
                
                {!review.comment && (
                  <div className="flex mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-300"}
                      />
                    ))}
                  </div>
                )}
                
                {review.comment && (
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-neutral-500">No reviews yet for this product.</p>
          )}
        </div>

        {/* RIGHT SIDE: Rating & Comment (BAĞIMSIZ) */}
        <div className="space-y-6">
          
          {/* RATING SECTION - Yıldıza tıkla, hemen gönder */}
          <div className="bg-yellow-50 p-6 rounded-xl">
            <h3 className="text-lg font-medium mb-2">⭐ Rate this Product</h3>
            <p className="text-sm text-neutral-600 mb-4">Click a star to rate instantly!</p>

            {!user ? (
              <div className="flex items-center gap-2 text-neutral-500">
                <Lock size={16} />
                <span className="text-sm">Sign in to rate</span>
              </div>
            ) : checkingPurchase ? (
              <p className="text-sm text-neutral-500">Checking purchase status...</p>
            ) : canReview === false ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <ShoppingBag size={18} />
                <span className="text-sm font-medium">You can rate this product after it has been delivered</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      disabled={isSubmittingRating}
                      className="focus:outline-none transition-transform hover:scale-125 disabled:opacity-50"
                    >
                      <Star
                        size={32}
                        className={
                          star <= hoveredStar
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-neutral-300"
                        }
                      />
                    </button>
                  ))}
                </div>
                
                {isSubmittingRating && (
                  <p className="text-sm text-neutral-500 mt-2">Submitting rating...</p>
                )}
                {ratingStatus === "success" && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle size={14} /> Rating submitted!
                  </p>
                )}
                {ratingStatus === "error" && (
                  <p className="text-sm text-red-500 mt-2">Failed to submit rating</p>
                )}
              </>
            )}
          </div>

          {/* COMMENT SECTION - Ayrı form */}
          <div className="bg-neutral-50 p-6 rounded-xl">
            <h3 className="text-lg font-medium mb-2">💬 Write a Comment</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Comments require admin approval before appearing.
            </p>

            {!user ? (
              <div className="flex items-center gap-2 text-neutral-500">
                <Lock size={16} />
                <span className="text-sm">Sign in to comment</span>
              </div>
            ) : checkingPurchase ? (
              <p className="text-sm text-neutral-500">Checking purchase status...</p>
            ) : canReview === false ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                <ShoppingBag size={18} />
                <span className="text-sm font-medium">You can comment on this product after it has been delivered</span>
              </div>
            ) : commentStatus === "success" ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="mx-auto text-green-600 mb-2" />
                <h4 className="text-green-800 font-medium">Comment Submitted!</h4>
                <p className="text-green-700 text-sm mt-1">
                  Your comment is pending admin approval.
                </p>
                <button 
                  onClick={() => setCommentStatus("idle")}
                  className="mt-3 text-xs text-green-800 underline hover:text-green-900"
                >
                  Write another comment
                </button>
              </div>
            ) : (
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                {commentStatus === "error" && (
                  <p className="text-red-500 text-sm">An error occurred. Please try again.</p>
                )}

                <textarea
                  rows={3}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full rounded-md border border-neutral-300 p-3 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                />

                <button
                  type="submit"
                  disabled={!userComment.trim() || isSubmittingComment}
                  className="w-full bg-black text-white py-2.5 rounded-md font-medium text-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSubmittingComment ? "Submitting..." : "Submit Comment"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}