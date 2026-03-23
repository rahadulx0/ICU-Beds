import { useState } from 'react';
import api from '../api/axios';
import { Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReviewForm({ hospitalId, ambulanceRequestId, onSubmitted, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        hospital: hospitalId,
        ambulance_request: ambulanceRequestId,
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
      });
      toast.success('Review submitted!');
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Star Rating */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hover || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="How was your experience?"
          className="input-field resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary text-sm">
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting || rating === 0} className="btn-primary text-sm">
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
