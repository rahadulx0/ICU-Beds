import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchRequests,
  fetchActiveRequest,
  acceptRequest,
  updateRequestStatus,
  setDriverLocation,
} from '../store/ambulanceSlice';
import { toggleDriverOnline } from '../store/authSlice';
import socket from '../socket';
import Map from '../components/Map';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Radio,
  XCircle,
  AlertTriangle,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function DriverDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { requests, activeRequest, loading } = useSelector((state) => state.ambulance);
  const [isOnline, setIsOnline] = useState(user?.is_online || false);
  const locationInterval = useRef(null);

  useEffect(() => {
    dispatch(fetchActiveRequest());
    dispatch(fetchRequests({ status: 'pending' }));
  }, [dispatch]);

  useEffect(() => {
    socket.on('new-request', () => {
      dispatch(fetchRequests({ status: 'pending' }));
      toast('New ambulance request!', { icon: '🚨' });
    });

    socket.on('request-cancelled', () => {
      dispatch(fetchRequests({ status: 'pending' }));
      dispatch(fetchActiveRequest());
    });

    return () => {
      socket.off('new-request');
      socket.off('request-cancelled');
    };
  }, [dispatch]);

  useEffect(() => {
    if (isOnline && activeRequest && ['accepted', 'en-route'].includes(activeRequest.status)) {
      locationInterval.current = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              socket.emit('driver-location', {
                latitude,
                longitude,
                requestId: activeRequest._id,
              });
              dispatch(setDriverLocation({ latitude, longitude }));
            },
            null,
            { enableHighAccuracy: true }
          );
        }
      }, 3000);
    }

    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
      }
    };
  }, [isOnline, activeRequest, dispatch]);

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    const result = await dispatch(toggleDriverOnline(newStatus));
    if (toggleDriverOnline.fulfilled.match(result)) {
      setIsOnline(newStatus);
      if (newStatus) {
        socket.connect();
        toast.success('You are now online');
      } else {
        toast.success('You are now offline');
      }
    } else {
      toast.error(result.payload || 'Failed to update status');
    }
  };

  const handleAccept = async (id) => {
    const result = await dispatch(acceptRequest(id));
    if (acceptRequest.fulfilled.match(result)) {
      toast.success('Request accepted!');
      socket.emit('join-tracking', result.payload._id);
    } else {
      toast.error(result.payload || 'Failed to accept request');
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!activeRequest) return;
    const result = await dispatch(
      updateRequestStatus({ id: activeRequest._id, status })
    );
    if (updateRequestStatus.fulfilled.match(result)) {
      toast.success(`Status updated to ${status}`);
      if (status === 'completed') {
        dispatch(fetchRequests({ status: 'pending' }));
      }
    }
  };

  const emergencyColors = {
    critical: 'badge-red',
    moderate: 'badge-yellow',
    stable: 'badge-green',
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div>
      {/* Header with online toggle */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}
          />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <button
          onClick={toggleOnline}
          className={`${isOnline ? 'btn-danger' : 'btn-success'} text-sm min-h-[44px]`}
        >
          <Radio className="h-4 w-4" />
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Status"
          value={isOnline ? 'Online' : 'Offline'}
          icon={Radio}
          color={isOnline ? 'emerald' : 'red'}
        />
        <StatsCard
          title="Pending Requests"
          value={pendingRequests.length}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Active Job"
          value={activeRequest ? 'Yes' : 'None'}
          icon={Truck}
          color="primary"
        />
      </div>

      {/* Active Request */}
      {activeRequest && ['accepted', 'en-route'].includes(activeRequest.status) && (
        <div className="mt-6 card border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Job</h3>
            <span
              className={`badge ${
                activeRequest.status === 'accepted' ? 'badge-blue' : 'badge-green'
              }`}
            >
              {activeRequest.status === 'accepted' ? 'Accepted' : 'En Route'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {activeRequest.patient && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Patient:</span>
                <span className="font-medium dark:text-white">{activeRequest.patient.name}</span>
                {activeRequest.patient.phone && (
                  <a
                    href={`tel:${activeRequest.patient.phone}`}
                    className="ml-auto flex items-center gap-1 text-primary-600 dark:text-primary-400 min-h-[44px] min-w-[44px] justify-center"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Pickup:</span>
              <span className="font-medium dark:text-white">{activeRequest.pickup_address}</span>
            </div>

            {activeRequest.hospital && (
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Hospital:</span>
                <span className="font-medium dark:text-white">{activeRequest.hospital.name}</span>
              </div>
            )}

            <span className={emergencyColors[activeRequest.emergency_type]}>
              {activeRequest.emergency_type}
            </span>
          </div>

          {activeRequest.hospital && (
            <Map
              hospitals={[
                {
                  _id: activeRequest.hospital._id,
                  name: activeRequest.hospital.name,
                  address: activeRequest.hospital.address || '',
                  location: activeRequest.hospital.location,
                  available_icu_beds: 0,
                  total_icu_beds: 1,
                },
              ]}
              className="mt-4 h-48"
            />
          )}

          <div className="mt-4 flex gap-3">
            {activeRequest.status === 'accepted' && (
              <button
                onClick={() => handleStatusUpdate('en-route')}
                className="btn-primary flex-1 min-h-[44px]"
              >
                <Truck className="h-4 w-4" />
                Start Route
              </button>
            )}
            {activeRequest.status === 'en-route' && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="btn-success flex-1 min-h-[44px]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Trip
              </button>
            )}
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              className="btn-danger min-h-[44px]"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Requests</h3>
        {loading ? (
          <LoadingSpinner />
        ) : pendingRequests.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
            <Clock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No pending requests</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">New requests will appear here</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingRequests.map((req) => (
              <div key={req._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    {req.patient && (
                      <p className="font-medium text-gray-900 dark:text-white">{req.patient.name}</p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {req.pickup_address}
                    </p>
                    {req.hospital && (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Navigation className="h-3.5 w-3.5" />
                        To: {req.hospital.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={emergencyColors[req.emergency_type]}>
                      {req.emergency_type}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {req.notes && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{req.notes}</p>
                )}

                <button
                  onClick={() => handleAccept(req._id)}
                  disabled={!!activeRequest}
                  className="btn-primary mt-3 w-full text-sm min-h-[44px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
