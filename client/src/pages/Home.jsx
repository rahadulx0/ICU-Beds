import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchHospitals, setSelected, setFilter, createHospital } from '../store/hospitalSlice';
import { createRequest } from '../store/ambulanceSlice';
import Map, { BedBadge } from '../components/Map';
import HospitalCard from '../components/HospitalCard';
import AmbulanceTracker from '../components/AmbulanceTracker';
import SOSButton from '../components/SOSButton';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Search,
  Filter,
  Locate,
  ChevronDown,
  Hospital,
  AlertCircle,
  MapPin,
  Map as MapIcon,
  List,
  X,
  Building2,
  Bed,
  Phone,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: hospitals, loading, selected, filter } = useSelector((state) => state.hospitals);
  const { user } = useSelector((state) => state.auth);
  const { activeRequest } = useSelector((state) => state.ambulance);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'
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

  // When a hospital is selected on mobile list, show detail popup
  const handleMobileHospitalSelect = (hospital) => {
    dispatch(setSelected(hospital));
  };

  return (
    <div className="flex h-[calc(100vh-56px-56px)] flex-col md:h-[calc(100vh-56px)] lg:flex-row">
      {/* ===== MOBILE VIEW ===== */}
      <div className="flex h-full flex-col lg:hidden">
        {/* Mobile: List View */}
        {mobileView === 'list' && (
          <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
            {/* Stats Cards */}
            <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{hospitals.length}</p>
                  <p className="text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">{t('home.hospitals')}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-900/20">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{availableBeds}</p>
                  <p className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">{t('home.available')}</p>
                </div>
                <div className="rounded-xl bg-gray-100 p-3 text-center dark:bg-gray-800">
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{totalBeds}</p>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{t('home.totalBeds')}</p>
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 text-sm"
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
              <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <AmbulanceTracker />
              </div>
            )}

            {/* Hospital List - Full height */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <LoadingSpinner />
              ) : filteredHospitals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <Building2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">{t('home.noHospitals')}</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHospitals.map((hospital) => (
                    <HospitalCard
                      key={hospital._id}
                      hospital={hospital}
                      compact
                      onSelect={handleMobileHospitalSelect}
                      onRequestAmbulance={user?.role === 'user' ? handleRequestAmbulance : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Floating Map Button */}
            <button
              onClick={() => setMobileView('map')}
              className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-600/30 transition-all active:scale-95 dark:shadow-primary-900/50"
            >
              <MapIcon className="h-4 w-4" />
              View Map
            </button>
          </div>
        )}

        {/* Mobile: Map View */}
        {mobileView === 'map' && (
          <div className="relative h-full">
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

            {/* Back to list button */}
            <button
              onClick={() => { setMobileView('list'); dispatch(setSelected(null)); }}
              className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg transition-all active:scale-95 dark:bg-gray-800 dark:text-gray-200"
            >
              <List className="h-4 w-4" />
              Hospitals
            </button>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 z-[1000] rounded-xl border border-gray-200 bg-white/90 p-2.5 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Beds</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">{t('home.legend.available')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/30" />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">{t('home.legend.low')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-red-50 dark:bg-red-900/30" />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">{t('home.legend.noBeds')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hospital Detail - Mobile Bottom Sheet */}
        {selected && (
          <div className="fixed inset-0 z-50" onClick={() => dispatch(setSelected(null))}>
            <div className="absolute inset-0 bg-black/40 modal-overlay" />
            <div
              className="absolute bottom-0 w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-3 shadow-2xl dark:bg-gray-800 bottom-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{selected.address}</span>
                  </p>
                </div>
                <button
                  onClick={() => dispatch(setSelected(null))}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Bed Availability */}
              <div className="mt-4 rounded-xl bg-gray-50 p-3.5 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ICU Beds</span>
                  </div>
                  <BedBadge available={selected.available_icu_beds} total={selected.total_icu_beds} />
                </div>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{selected.available_icu_beds}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {selected.total_icu_beds} available</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selected.available_icu_beds === 0 ? 'bg-red-500'
                        : selected.available_icu_beds / selected.total_icu_beds <= 0.2 ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${selected.total_icu_beds > 0 ? Math.round(((selected.total_icu_beds - selected.available_icu_beds) / selected.total_icu_beds) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-xs text-gray-500 dark:text-gray-400">
                  {selected.total_icu_beds > 0 ? Math.round(((selected.total_icu_beds - selected.available_icu_beds) / selected.total_icu_beds) * 100) : 0}% utilized
                </p>
              </div>

              {/* Contact */}
              {selected.contact?.phone && (
                <a href={`tel:${selected.contact.phone}`} className="mt-3 flex items-center gap-2 rounded-lg p-2 text-sm text-primary-600 hover:bg-gray-50 dark:text-primary-400 dark:hover:bg-gray-700/50 min-h-[44px]">
                  <Phone className="h-4 w-4" />
                  {selected.contact.phone}
                </a>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {selected.location?.coordinates?.length === 2 && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.location.coordinates[1]},${selected.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex-1 text-sm"
                  >
                    <Navigation className="h-4 w-4" />
                    Directions
                  </a>
                )}
                {user?.role === 'user' && (
                  <button
                    onClick={() => { handleRequestAmbulance(selected); dispatch(setSelected(null)); }}
                    className="btn-primary flex-1 text-sm"
                  >
                    Request Ambulance
                  </button>
                )}
              </div>

              {/* View Full Details */}
              <button
                onClick={() => { navigate(`/hospitals/${selected._id}`); dispatch(setSelected(null)); }}
                className="mt-3 w-full rounded-xl py-2.5 text-center text-sm font-medium text-primary-600 transition-all hover:bg-primary-50 active:scale-[0.97] dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                View Full Details &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      {/* Sidebar */}
      <div className="hidden w-[400px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:flex">
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
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Building2 className="h-7 w-7 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('home.noHospitals')}</p>
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

      {/* Desktop Map */}
      <div className="relative hidden min-h-0 flex-1 lg:block">
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

        {/* Hospital Detail - Desktop Right Panel */}
        {selected && (
          <div className="absolute right-0 top-0 z-[1000] flex h-full w-[360px] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 animate-slide-in-right">
            <div className="flex-1 overflow-y-auto p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{selected.address}</span>
                  </p>
                </div>
                <button
                  onClick={() => dispatch(setSelected(null))}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Bed Availability */}
              <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ICU Beds</span>
                  </div>
                  <BedBadge available={selected.available_icu_beds} total={selected.total_icu_beds} />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{selected.available_icu_beds}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {selected.total_icu_beds} available</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selected.available_icu_beds === 0 ? 'bg-red-500'
                        : selected.available_icu_beds / selected.total_icu_beds <= 0.2 ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${selected.total_icu_beds > 0 ? Math.round(((selected.total_icu_beds - selected.available_icu_beds) / selected.total_icu_beds) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
                  {selected.total_icu_beds > 0 ? Math.round(((selected.total_icu_beds - selected.available_icu_beds) / selected.total_icu_beds) * 100) : 0}% utilized
                </p>
              </div>

              {/* Contact */}
              {selected.contact?.phone && (
                <a href={`tel:${selected.contact.phone}`} className="mt-4 flex items-center gap-2 rounded-lg p-2.5 text-sm text-primary-600 hover:bg-gray-50 dark:text-primary-400 dark:hover:bg-gray-700/50">
                  <Phone className="h-4 w-4" />
                  {selected.contact.phone}
                </a>
              )}

              {/* Actions */}
              <div className="mt-5 space-y-2">
                {selected.location?.coordinates?.length === 2 && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.location.coordinates[1]},${selected.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-sm"
                  >
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </a>
                )}
                {user?.role === 'user' && (
                  <button
                    onClick={() => { handleRequestAmbulance(selected); dispatch(setSelected(null)); }}
                    className="btn-primary w-full text-sm"
                  >
                    Request Ambulance
                  </button>
                )}
              </div>

              {/* View Full Details */}
              <button
                onClick={() => { navigate(`/hospitals/${selected._id}`); dispatch(setSelected(null)); }}
                className="mt-4 w-full rounded-xl py-2.5 text-center text-sm font-medium text-primary-600 transition-all hover:bg-primary-50 active:scale-[0.97] dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                View Full Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-xl border border-gray-200 bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 modal-overlay p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-gray-800 sm:rounded-2xl bottom-sheet sm:modal-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="request-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t('ambulance.requestAmbulance')}</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  To: {showRequestModal.name}
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitRequest} className="mt-5 space-y-4">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 modal-overlay p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-hospital-modal-title">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-gray-800 sm:rounded-2xl bottom-sheet sm:modal-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="add-hospital-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">Add Hospital</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {showAddHospitalModal.lat.toFixed(5)}, {showAddHospitalModal.lng.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => setShowAddHospitalModal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitAddHospital} className="mt-5 space-y-4">
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
