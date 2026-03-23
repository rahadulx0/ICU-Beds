import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchActiveRequest,
  cancelRequest,
  setDriverLocation,
} from '../store/ambulanceSlice';
import socket from '../socket';
import Map from './Map';
import {
  Loader2,
  Phone,
  X,
  CheckCircle2,
  Truck,
  Clock,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: {
    label: 'Finding Driver',
    color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    icon: Clock,
    description: 'Looking for an available ambulance driver near you...',
  },
  accepted: {
    label: 'Driver Assigned',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
    icon: CheckCircle2,
    description: 'A driver has accepted your request and is preparing.',
  },
  'en-route': {
    label: 'En Route',
    color: 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30',
    icon: Truck,
    description: 'The ambulance is on its way to your location.',
  },
};

export default function AmbulanceTracker() {
  const dispatch = useDispatch();
  const { activeRequest, driverLocation } = useSelector((state) => state.ambulance);
  const { user } = useSelector((state) => state.auth);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    dispatch(fetchActiveRequest());
  }, [dispatch]);

  useEffect(() => {
    if (!activeRequest) return;

    socket.emit('join-tracking', activeRequest._id);

    socket.on('driver-location-update', (data) => {
      dispatch(setDriverLocation({ latitude: data.latitude, longitude: data.longitude }));
      if (data.eta) setEta(data.eta);
    });

    socket.on('status-update', (data) => {
      dispatch(fetchActiveRequest());
      if (data.status === 'completed') {
        toast.success('Ambulance has arrived!');
      }
    });

    socket.on('request-accepted', (data) => {
      if (data.request.patient?._id === user?._id || data.request.patient === user?._id) {
        dispatch(fetchActiveRequest());
        toast.success('A driver has accepted your request!');
      }
    });

    return () => {
      socket.emit('leave-tracking', activeRequest._id);
      socket.off('driver-location-update');
      socket.off('status-update');
      socket.off('request-accepted');
    };
  }, [activeRequest?._id, dispatch, user?._id]);

  if (!activeRequest) return null;

  const status = statusConfig[activeRequest.status];
  if (!status) return null;
  const StatusIcon = status.icon;

  const hospitals = activeRequest.hospital
    ? [
        {
          _id: activeRequest.hospital._id,
          name: activeRequest.hospital.name,
          address: activeRequest.hospital.address || '',
          location: activeRequest.hospital.location,
          available_icu_beds: 0,
          total_icu_beds: 1,
        },
      ]
    : [];

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ambulance Tracking</h3>
        <div className={`badge ${status.color}`}>
          <StatusIcon className="mr-1 h-3.5 w-3.5" />
          {status.label}
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{status.description}</p>

      {/* ETA Display */}
      {eta && activeRequest.status !== 'pending' && (
        <div className="mb-4 flex items-center gap-4 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
              ~{activeRequest.status === 'en-route' ? eta.toHospital?.etaMinutes : eta.toPickup?.etaMinutes} min
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-500">
              {activeRequest.status === 'en-route' ? 'to hospital' : 'to pickup'}
            </p>
          </div>
          <div className="text-center border-l border-primary-200 pl-4 dark:border-primary-700">
            <p className="text-lg font-semibold text-primary-700 dark:text-primary-400">
              {activeRequest.status === 'en-route' ? eta.toHospital?.distanceKm : eta.toPickup?.distanceKm} km
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-500">away</p>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        hospitals={hospitals}
        driverLocation={driverLocation}
        className="mb-4 h-64"
      />

      {/* Details */}
      <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
        {activeRequest.hospital && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Destination:</span>
            <span className="font-medium dark:text-white">{activeRequest.hospital.name}</span>
          </div>
        )}

        {activeRequest.driver && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Driver:</span>
            <span className="font-medium dark:text-white">{activeRequest.driver.name}</span>
            {activeRequest.driver.phone && (
              <a
                href={`tel:${activeRequest.driver.phone}`}
                className="ml-auto flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 min-h-[44px]"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            )}
          </div>
        )}

        {activeRequest.pickup_address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Pickup:</span>
            <span className="font-medium dark:text-white">{activeRequest.pickup_address}</span>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {['pending', 'accepted'].includes(activeRequest.status) && (
        <button
          onClick={() => {
            dispatch(cancelRequest(activeRequest._id));
            toast.success('Request cancelled');
          }}
          className="btn-danger mt-4 w-full min-h-[44px]"
        >
          <X className="h-4 w-4" />
          Cancel Request
        </button>
      )}

      {activeRequest.status === 'en-route' && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary-50 p-3 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ambulance is on the way...
        </div>
      )}
    </div>
  );
}
