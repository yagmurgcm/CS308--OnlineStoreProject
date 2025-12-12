"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Review = {
  id: number;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  user?: {
    id: number;
    name?: string;
    email?: string;
  };
  product?: {
    id: number;
    name: string;
  };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = filter === "pending" ? "/reviews/admin/pending" : "/reviews/admin/all";
      const data = await api.get<Review[]>(endpoint);
      setReviews(data || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setError("Failed to load reviews. Make sure you're logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const handleApprove = async (reviewId: number) => {
    setActionLoading(reviewId);
    try {
      await api.patch(`/reviews/admin/${reviewId}/approve`, {});
      // Refresh list
      await fetchReviews();
    } catch (err) {
      console.error("Failed to approve review:", err);
      alert("Failed to approve review");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reviewId: number) => {
    if (!confirm("Are you sure you want to reject and delete this review?")) {
      return;
    }
    setActionLoading(reviewId);
    try {
      await api.delete(`/reviews/admin/${reviewId}/reject`);
      // Refresh list
      await fetchReviews();
    } catch (err) {
      console.error("Failed to reject review:", err);
      alert("Failed to reject review");
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? "text-yellow-400" : "text-gray-300"}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <p className="text-gray-600 mt-1">Approve or reject customer reviews</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "pending"
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            ⏳ Pending Approval
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            📋 All Reviews
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-600">
              {filter === "pending"
                ? "No pending reviews! All caught up."
                : "No reviews found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-xl border p-5 ${
                  review.isApproved ? "border-green-200" : "border-orange-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Review Info */}
                  <div className="flex-1">
                    {/* Product & User */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">
                        {review.product?.name || `Product #${review.product?.id}`}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        by {review.user?.name || review.user?.email || `User #${review.user?.id}`}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        ({review.rating}/5)
                      </span>
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-gray-700 bg-gray-50 rounded-lg p-3 mt-2">
                        "{review.comment}"
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      <span>
                        {new Date(review.createdAt).toLocaleString("tr-TR")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          review.isApproved
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {review.isApproved ? "✓ Approved" : "⏳ Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {!review.isApproved && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={actionLoading === review.id}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
                      >
                        {actionLoading === review.id ? "..." : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(review.id)}
                        disabled={actionLoading === review.id}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
                      >
                        {actionLoading === review.id ? "..." : "✗ Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && !error && reviews.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

