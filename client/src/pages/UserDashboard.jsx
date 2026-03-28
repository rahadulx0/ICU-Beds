import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRequests, fetchActiveRequest } from '../store/ambulanceSlice';
import AmbulanceTracker from '../components/AmbulanceTracker';
import ReviewForm from '../components/ReviewForm';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Star,
  Navigation,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UserDashboard() {
  const dispatch = useDispatch();
  const { requests, activeRequest, loading } = useSelector(
    (state) => state.ambulance
  );
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  useEffect(() => {
    dispatch(fetchActiveRequest());
    dispatch(fetchRequests({}));
  }, [dispatch]);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', badge: 'badge-yellow' },
    accepted: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'badge-blue' },
    'en-route': { icon: Truck, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20', badge: 'badge-blue' },
    completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'badge-green' },
    cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'badge-red' },
  };

  return (
    <div className="animate-in">
      {/* Active request tracker */}
      {activeRequest && (
        <div className="mb-5">
          <AmbulanceTracker />
        </div>
      )}

      {/* Request history */}
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Your Requests</h3>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center dark:border-gray-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <Navigation className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>
          <h4 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">No requests yet</h4>
          <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
            Your ambulance requests will appear here. Use the map to request one.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3 stagger-in">
          {requests.map((req) => {
            const status = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={req._id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${status.bg}`}>
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {req.hospital && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{req.hospital.name}</p>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {req.pickup_address}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={status.badge}>{req.status}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {req.driver && <span>Driver: {req.driver.name}</span>}
                        <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                      </div>
                      {req.status === 'completed' && !reviewedIds.has(req._id) && reviewingId !== req._id && (
                        <button
                          onClick={() => setReviewingId(req._id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 active:scale-95 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                          <Star className="h-3 w-3" />
                          Rate
                        </button>
                      )}
                      {reviewedIds.has(req._id) && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">Reviewed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Review Form */}
                {reviewingId === req._id && (
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700 animate-in">
                    <ReviewForm
                      hospitalId={req.hospital?._id}
                      ambulanceRequestId={req._id}
                      onSubmitted={() => {
                        setReviewingId(null);
                        setReviewedIds((prev) => new Set([...prev, req._id]));
                      }}
                      onCancel={() => setReviewingId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
