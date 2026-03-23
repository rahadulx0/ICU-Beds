import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchHospitals, updateBeds } from '../store/hospitalSlice';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import Map from '../components/Map';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Hospital,
  Bed,
  AlertCircle,
  Activity,
  Truck,
  Save,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ModeratorDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list: allHospitals, loading } = useSelector((state) => state.hospitals);
  const [editValues, setEditValues] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    dispatch(fetchHospitals());
    fetchRecentRequests();
  }, [dispatch]);

  const hospitals = allHospitals.filter(
    (h) => user.assigned_hospitals?.includes(h._id)
  );

  const fetchRecentRequests = async () => {
    try {
      const { data } = await api.get('/ambulance/requests?limit=20');
      // Filter to requests for assigned hospitals
      const filtered = (data.requests || []).filter((r) =>
        user.assigned_hospitals?.includes(r.hospital?._id || r.hospital)
      );
      setRecentRequests(filtered.slice(0, 10));
    } catch {
      // Non-critical
    }
    setRequestsLoading(false);
  };

  const totalBeds = hospitals.reduce((s, h) => s + h.total_icu_beds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.available_icu_beds, 0);
  const fullHospitals = hospitals.filter((h) => h.available_icu_beds === 0).length;
  const lowHospitals = hospitals.filter(
    (h) => h.available_icu_beds > 0 && h.available_icu_beds / h.total_icu_beds <= 0.2
  ).length;

  const handleBedUpdate = async (hospital) => {
    const newCount = editValues[hospital._id];
    if (newCount === undefined || newCount === hospital.available_icu_beds) return;

    if (newCount > hospital.total_icu_beds) {
      return toast.error('Cannot exceed total beds');
    }
    if (newCount < 0) {
      return toast.error('Cannot be negative');
    }

    const result = await dispatch(
      updateBeds({
        id: hospital._id,
        available_icu_beds: parseInt(newCount),
        version: hospital.version || 0,
      })
    );

    if (updateBeds.fulfilled.match(result)) {
      toast.success(`Updated ${hospital.name}`);
      setEditValues((prev) => {
        const copy = { ...prev };
        delete copy[hospital._id];
        return copy;
      });
    } else {
      toast.error(result.payload || 'Update failed');
      dispatch(fetchHospitals());
    }
  };

  const statusColors = {
    pending: 'badge-yellow',
    accepted: 'badge-blue',
    'en-route': 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
  };

  if (loading) return <LoadingSpinner />;

  if (hospitals.length === 0) {
    return (
      <div className="py-16 text-center">
        <Hospital className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">No hospitals assigned</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Contact your administrator to be assigned to hospitals.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="My Hospitals"
          value={hospitals.length}
          icon={Hospital}
          color="primary"
        />
        <StatsCard
          title="Available Beds"
          value={availableBeds}
          subtitle={`of ${totalBeds} total`}
          icon={Bed}
          color="emerald"
        />
        <StatsCard
          title="Low / Full"
          value={`${lowHospitals} / ${fullHospitals}`}
          icon={AlertCircle}
          color="amber"
        />
        <StatsCard
          title="Recent Requests"
          value={recentRequests.length}
          icon={Truck}
          color="violet"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'beds', label: 'Bed Management', icon: Bed },
          { key: 'activity', label: 'Activity', icon: Clock },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="mt-4 space-y-6">
          {/* Map of assigned hospitals */}
          <div className="card">
            <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Hospital Map</h3>
            <Map hospitals={hospitals} className="h-64 sm:h-80" />
          </div>

          {/* Hospital status cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {hospitals.map((h) => {
              const ratio = h.total_icu_beds > 0 ? h.available_icu_beds / h.total_icu_beds : 0;
              return (
                <div key={h._id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{h.name}</h4>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{h.address}</p>
                    </div>
                    {h.available_icu_beds === 0 ? (
                      <span className="badge-red">Full</span>
                    ) : ratio <= 0.2 ? (
                      <span className="badge-yellow">Low</span>
                    ) : (
                      <span className="badge-green">OK</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">ICU Beds</span>
                      <span className="font-semibold dark:text-white">
                        {h.available_icu_beds} / {h.total_icu_beds}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          h.available_icu_beds === 0
                            ? 'bg-red-500'
                            : ratio <= 0.2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bed Management Tab */}
      {tab === 'beds' && (
        <div className="mt-4 space-y-4">
          {hospitals.map((hospital) => {
            const editValue = editValues[hospital._id];
            const hasChange =
              editValue !== undefined && parseInt(editValue) !== hospital.available_icu_beds;

            return (
              <div key={hospital._id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {hospital.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {hospital.address}
                    </p>
                  </div>
                  {hospital.available_icu_beds === 0 ? (
                    <span className="badge-red">Full</span>
                  ) : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2 ? (
                    <span className="badge-yellow">Low</span>
                  ) : (
                    <span className="badge-green">Available</span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">ICU Bed Availability</span>
                    <span className="font-semibold dark:text-white">
                      {hospital.available_icu_beds} / {hospital.total_icu_beds}
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        hospital.available_icu_beds === 0
                          ? 'bg-red-500'
                          : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${(hospital.available_icu_beds / hospital.total_icu_beds) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap dark:text-gray-300">
                    Available:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={hospital.total_icu_beds}
                    className="input w-24"
                    value={editValue ?? hospital.available_icu_beds}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [hospital._id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    onClick={() => handleBedUpdate(hospital)}
                    disabled={!hasChange}
                    className="btn-primary py-2 text-sm min-h-[44px]"
                  >
                    <Save className="h-4 w-4" />
                    Update
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Tab */}
      {tab === 'activity' && (
        <div className="mt-4">
          {requestsLoading ? (
            <LoadingSpinner />
          ) : recentRequests.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <div key={req._id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {req.patient?.name || 'Unknown patient'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {req.hospital?.name || 'Unknown hospital'}
                      </p>
                      {req.pickup_address && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          From: {req.pickup_address}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 text-right flex-shrink-0">
                      <span className={statusColors[req.status] || 'badge-gray'}>
                        {req.status}
                      </span>
                      <p className="mt-1 text-xs text-gray-400">
                        {req.createdAt
                          ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
