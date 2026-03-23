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
  Navigation,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UserDashboard() {
  const dispatch = useDispatch();
  const { requests, activeRequest, loading, pagination } = useSelector(
    (state) => state.ambulance
  );
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  useEffect(() => {
    dispatch(fetchActiveRequest());
    dispatch(fetchRequests({}));
  }, [dispatch]);

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-amber-500" />,
    accepted: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
    'en-route': <Truck className="h-4 w-4 text-primary-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    cancelled: <XCircle className="h-4 w-4 text-red-500" />,
  };

  const statusBadge = {
    pending: 'badge-yellow',
    accepted: 'badge-blue',
    'en-route': 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
  };

  return (
    <div>
      {/* Active request tracker */}
      {activeRequest && (
        <div className="mb-6">
          <AmbulanceTracker />
        </div>
      )}

      {/* Request history */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Requests</h3>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <Truck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h4 className="mt-3 text-base font-medium text-gray-900 dark:text-white">No requests yet</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your ambulance requests will appear here. Use the map to request one.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((req) => (
            <div key={req._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {statusIcon[req.status]}
                  <div>
                    {req.hospital && (
                      <p className="font-medium text-gray-900 dark:text-white">{req.hospital.name}</p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {req.pickup_address}
                    </p>
                    {req.driver && (
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        Driver: {req.driver.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={statusBadge[req.status]}>{req.status}</span>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                  {req.status === 'completed' && !reviewedIds.has(req._id) && reviewingId !== req._id && (
                    <button
                      onClick={() => setReviewingId(req._id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Rate Trip
                    </button>
                  )}
                  {reviewedIds.has(req._id) && (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">Reviewed</p>
                  )}
                </div>
              </div>

              {/* Inline Review Form */}
              {reviewingId === req._id && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
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
          ))}
        </div>
      )}
    </div>
  );
}
