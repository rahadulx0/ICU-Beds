import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewList({ hospitalId }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReviews = async (page = 1) => {
    try {
      const { data } = await api.get(`/reviews/hospital/${hospitalId}?page=${page}&limit=5`);
      setReviews(data.reviews);
      setAvgRating(data.avgRating);
      setReviewCount(data.reviewCount);
      setPagination(data.pagination);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [hospitalId]);

  if (loading) return null;
  if (reviewCount === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="h-5 w-5" />
          Reviews
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Star className="h-5 w-5" />
        Reviews
      </h2>

      {/* Average Rating Summary */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{avgRating}</span>
        <div>
          <StarDisplay rating={Math.round(avgRating)} />
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Review Cards */}
      <div className="mt-4 space-y-3">
        {reviews.map((review) => (
          <div key={review._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {review.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {review.user?.name || 'Anonymous'}
                  </p>
                  <StarDisplay rating={review.rating} />
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
            </div>
            {review.comment && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchReviews(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="btn-secondary p-2 text-sm disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => fetchReviews(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="btn-secondary p-2 text-sm disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
