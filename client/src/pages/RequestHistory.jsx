import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRequests } from '../store/ambulanceSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { Clock, CheckCircle2, Truck, XCircle, AlertCircle, MapPin, Navigation } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', label: 'Pending' },
  accepted: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', label: 'Accepted' },
  'en-route': { icon: Truck, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/30', label: 'En Route' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30', label: 'Cancelled' },
};

export default function RequestHistory() {
  const dispatch = useDispatch();
  const { requests, loading, pagination } = useSelector((state) => state.ambulance);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = { page, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchRequests(params));
  }, [dispatch, page, statusFilter]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-3 sm:py-6 pb-20 sm:pb-6 animate-in">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Request History</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="en-route">En Route</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No requests found</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {requests.map((req) => {
            const config = statusConfig[req.status] || statusConfig.pending;
            const Icon = config.icon;
            return (
              <div key={req._id} className="card !p-3 sm:!p-4">
                {/* Top row: status icon + badges + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <span className={`badge ${config.bg} ${config.color} text-[11px]`}>
                      {config.label}
                    </span>
                    <span className="badge badge-gray text-[11px] capitalize">{req.emergency_type}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-2 space-y-1 pl-10">
                  <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{req.pickup_address}</span>
                  </p>
                  {req.hospital && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Navigation className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{req.hospital.name}</span>
                    </p>
                  )}
                  {req.driver && (
                    <p className="text-[11px] text-gray-400">
                      Driver: {req.driver.name}
                    </p>
                  )}
                </div>

                {/* Timeline */}
                {req.accepted_at && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 pl-10 text-[11px] text-gray-400 dark:border-gray-700">
                    <span>{format(new Date(req.createdAt), 'HH:mm')}</span>
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
                    <span>Accepted {format(new Date(req.accepted_at), 'HH:mm')}</span>
                    {req.completed_at && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
                        <span className="text-emerald-500">Done {format(new Date(req.completed_at), 'HH:mm')}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm min-h-[44px]"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.pages, page + 1))}
            disabled={page === pagination.pages}
            className="btn-secondary text-sm min-h-[44px]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
