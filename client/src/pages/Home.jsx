import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchHospitals, setSelected, setFilter, createHospital } from '../store/hospitalSlice';
import { createRequest } from '../store/ambulanceSlice';
import Map from '../components/Map';
import HospitalCard from '../components/HospitalCard';
import AmbulanceTracker from '../components/AmbulanceTracker';
import SOSButton from '../components/SOSButton';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  Bed,
  Filter,
  Locate,
  ChevronDown,
  Hospital,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { list: hospitals, loading, selected, filter } = useSelector((state) => state.hospitals);
  const { user } = useSelector((state) => state.auth);
  const { activeRequest } = useSelector((state) => state.ambulance);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(null);
  const [requestForm, setRequestForm] = useState({
    pickup_address: '',
    emergency_type: 'moderate',
    notes: '',
  });
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(null);
  const [addHospitalForm, setAddHospitalForm] = useState({
    name: '',
    address: '',
    total_icu_beds: '',
    available_icu_beds: '',
    contact_phone: '',
    contact_email: '',
  });

  useEffect(() => {
    dispatch(fetchHospitals());
  }, [dispatch]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showRequestModal) setShowRequestModal(null);
        if (showAddHospitalModal) setShowAddHospitalModal(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRequestModal, showAddHospitalModal]);

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          toast.success('Location detected');
        },
        () => toast.error('Could not get your location')
      );
    }
  }, []);

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.address?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'available') return h.available_icu_beds > 0;
    if (filter === 'critical') return h.available_icu_beds === 0;
    return true;
  });

  const totalBeds = hospitals.reduce((sum, h) => sum + h.total_icu_beds, 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + h.available_icu_beds, 0);

  const handleRequestAmbulance = (hospital) => {
    if (!user) {
      toast.error('Please login to request an ambulance');
      return;
    }
    setShowRequestModal(hospital);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      toast.error('Please enable location access');
      return;
    }

    const result = await dispatch(
      createRequest({
        hospital: showRequestModal._id,
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        ...requestForm,
      })
    );

    if (createRequest.fulfilled.match(result)) {
      toast.success('Ambulance request sent!');
      setShowRequestModal(null);
      setRequestForm({ pickup_address: '', emergency_type: 'moderate', notes: '' });
    } else {
      toast.error(result.payload || 'Failed to request ambulance');
    }
  };

  const isAdmin = user?.role === 'admin';

  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);

  const handleAddHospitalClick = async (coords) => {
    setShowAddHospitalModal(coords);
    setAddHospitalForm({
      name: '',
      address: '',
      total_icu_beds: '',
      available_icu_beds: '',
      contact_phone: '',
      contact_email: '',
    });

    setReverseGeoLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      const name = data.name || data.address?.hospital || data.address?.building || '';
      const addressParts = [
        data.address?.road,
        data.address?.suburb || data.address?.neighbourhood,
        data.address?.city || data.address?.town || data.address?.village,
        data.address?.postcode,
      ].filter(Boolean);
      const address = addressParts.join(', ') || data.display_name || '';

      setAddHospitalForm((prev) => ({
        ...prev,
        name: name || prev.name,
        address: address || prev.address,
      }));
    } catch {
      // Silently fail
    } finally {
      setReverseGeoLoading(false);
    }
  };

  const submitAddHospital = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      createHospital({
        name: addHospitalForm.name,
        address: addHospitalForm.address,
        latitude: showAddHospitalModal.lat,
        longitude: showAddHospitalModal.lng,
        total_icu_beds: parseInt(addHospitalForm.total_icu_beds),
        available_icu_beds: parseInt(addHospitalForm.available_icu_beds || addHospitalForm.total_icu_beds),
        contact: {
          phone: addHospitalForm.contact_phone || undefined,
          email: addHospitalForm.contact_email || undefined,
        },
      })
    );

    if (createHospital.fulfilled.match(result)) {
      toast.success('Hospital added successfully!');
      setShowAddHospitalModal(null);
    } else {
      toast.error(result.payload || 'Failed to add hospital');
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px-56px)] flex-col md:h-[calc(100vh-64px)] lg:flex-row">
      {/* Sidebar */}
      <div className="flex max-h-[40vh] w-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:max-h-none lg:w-[400px]">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
          <div className="bg-white p-3 text-center dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{hospitals.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.hospitals')}</p>
          </div>
          <div className="bg-white p-3 text-center dark:bg-gray-900">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{availableBeds}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.available')}</p>
          </div>
          <div className="bg-white p-3 text-center dark:bg-gray-900">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalBeds}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.totalBeds')}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="border-b border-gray-200 p-3 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary py-1.5 text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              {t('home.filter')}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
            <button onClick={getUserLocation} className="btn-secondary py-1.5 text-xs">
              <Locate className="h-3.5 w-3.5" />
              {t('home.myLocation')}
            </button>
          </div>

          {showFilters && (
            <div className="mt-2 flex gap-1.5">
              {[
                { key: 'all', label: t('home.all') },
                { key: 'available', label: t('home.availableFilter') },
                { key: 'critical', label: t('home.noBeds') },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => dispatch(setFilter(f.key))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ambulance Tracker */}
        {user && activeRequest && (
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            <AmbulanceTracker />
          </div>
        )}

        {/* Hospital List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <LoadingSpinner />
          ) : filteredHospitals.length === 0 ? (
            <div className="py-12 text-center">
              <Hospital className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('home.noHospitals')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHospitals.map((hospital) => (
                <HospitalCard
                  key={hospital._id}
                  hospital={hospital}
                  compact
                  onSelect={(h) => dispatch(setSelected(h))}
                  onRequestAmbulance={user?.role === 'user' ? handleRequestAmbulance : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative min-h-[50vh] flex-1 lg:min-h-0">
        <Map
          hospitals={filteredHospitals}
          selectedHospital={selected}
          userLocation={userLocation}
          showUser={!!userLocation}
          onHospitalClick={(h) => dispatch(setSelected(h))}
          onRequestAmbulance={user?.role === 'user' ? handleRequestAmbulance : undefined}
          onAddHospital={isAdmin ? handleAddHospitalClick : undefined}
          className="h-full"
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 rounded-xl border border-gray-200 bg-white/90 p-2 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 lg:bottom-4 lg:left-4 lg:p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{t('home.bedAvailability')}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('home.legend.available')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/30" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('home.legend.low')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-red-500 bg-red-50 dark:bg-red-900/30" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('home.legend.noBeds')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency SOS Button */}
      <SOSButton />

      {/* Ambulance Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 id="request-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t('ambulance.requestAmbulance')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              To: {showRequestModal.name}
            </p>

            <form onSubmit={submitRequest} className="mt-4 space-y-4">
              <div>
                <label className="label">{t('ambulance.pickupAddress')}</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Enter your current address"
                  value={requestForm.pickup_address}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, pickup_address: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">{t('ambulance.emergencyType')}</label>
                <select
                  className="input"
                  value={requestForm.emergency_type}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, emergency_type: e.target.value })
                  }
                >
                  <option value="stable">{t('ambulance.stable')}</option>
                  <option value="moderate">{t('ambulance.moderate')}</option>
                  <option value="critical">{t('ambulance.critical')}</option>
                </select>
              </div>

              <div>
                <label className="label">{t('ambulance.notes')}</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Any additional information..."
                  value={requestForm.notes}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, notes: e.target.value })
                  }
                />
              </div>

              {!userLocation && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Enable location access to send your position.{' '}
                    <button
                      type="button"
                      onClick={getUserLocation}
                      className="font-medium underline"
                    >
                      Enable
                    </button>
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(null)}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={!userLocation}>
                  {t('ambulance.sendRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Hospital Modal (Admin) */}
      {showAddHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-hospital-modal-title">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 id="add-hospital-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">Add Hospital</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-3.5 w-3.5" />
              {showAddHospitalModal.lat.toFixed(5)}, {showAddHospitalModal.lng.toFixed(5)}
            </p>

            <form onSubmit={submitAddHospital} className="mt-4 space-y-4">
              <div>
                <label className="label">Hospital Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder={reverseGeoLoading ? 'Detecting from map...' : 'e.g., Dhaka Medical College'}
                    value={addHospitalForm.name}
                    onChange={(e) =>
                      setAddHospitalForm({ ...addHospitalForm, name: e.target.value })
                    }
                  />
                  {reverseGeoLoading && (
                    <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
                  )}
                </div>
              </div>

              <div>
                <label className="label">Address</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder={reverseGeoLoading ? 'Detecting from map...' : 'Full street address'}
                    value={addHospitalForm.address}
                    onChange={(e) =>
                      setAddHospitalForm({ ...addHospitalForm, address: e.target.value })
                    }
                  />
                  {reverseGeoLoading && (
                    <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total ICU Beds</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input"
                    placeholder="e.g., 20"
                    value={addHospitalForm.total_icu_beds}
                    onChange={(e) =>
                      setAddHospitalForm({ ...addHospitalForm, total_icu_beds: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Available Beds</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="e.g., 12"
                    value={addHospitalForm.available_icu_beds}
                    onChange={(e) =>
                      setAddHospitalForm({ ...addHospitalForm, available_icu_beds: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Phone (Optional)</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+880 XX XXXX XXXX"
                  value={addHospitalForm.contact_phone}
                  onChange={(e) =>
                    setAddHospitalForm({ ...addHospitalForm, contact_phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Email (Optional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="hospital@example.com"
                  value={addHospitalForm.contact_email}
                  onChange={(e) =>
                    setAddHospitalForm({ ...addHospitalForm, contact_email: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHospitalModal(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
