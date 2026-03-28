import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createRequest } from '../store/ambulanceSlice';
import api from '../api/axios';
import ConfirmDialog from './ConfirmDialog';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SOSButton() {
  const { user } = useSelector((state) => state.auth);
  const { activeRequest } = useSelector((state) => state.ambulance);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Only show for authenticated regular users with no active request
  if (!user || user.role !== 'user' || activeRequest) return null;

  const handleSOS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const { data } = await api.get(
            `/hospitals/nearby?lng=${longitude}&lat=${latitude}&radius=50000&beds=true`
          );

          if (!data || data.length === 0) {
            toast.error('No hospitals with available beds found nearby');
            setLoading(false);
            return;
          }

          const nearest = data[0];
          setConfirm({ hospital: nearest, latitude, longitude });
        } catch {
          toast.error('Failed to find nearby hospitals');
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error('Please enable location access for SOS');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (!confirm) return;

    const result = await dispatch(
      createRequest({
        hospital: confirm.hospital._id,
        longitude: confirm.longitude,
        latitude: confirm.latitude,
        pickup_address: 'SOS - Emergency Location',
        emergency_type: 'critical',
        notes: 'Emergency SOS request',
      })
    );

    if (createRequest.fulfilled.match(result)) {
      toast.success('Emergency ambulance dispatched!');
    } else {
      toast.error(result.payload || 'Failed to send SOS request');
    }

    setConfirm(null);
  };

  return (
    <>
      <button
        onClick={handleSOS}
        disabled={loading}
        className="fixed bottom-[4.5rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition-transform duration-150 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 md:h-16 md:w-16"
        aria-label="Emergency SOS"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
        <span className="relative flex flex-col items-center">
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Phone className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[9px] font-bold leading-tight">SOS</span>
            </>
          )}
        </span>
      </button>

      <ConfirmDialog
        isOpen={!!confirm}
        title="Emergency SOS"
        message={
          confirm
            ? `Send an emergency ambulance request to ${confirm.hospital.name}? This will dispatch the nearest available ambulance to your location.`
            : ''
        }
        confirmText="Send SOS"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
