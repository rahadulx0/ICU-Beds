import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchHospitals, updateBeds } from '../store/hospitalSlice';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Bed, Hospital, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HospitalManage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list: allHospitals, loading } = useSelector((state) => state.hospitals);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    dispatch(fetchHospitals());
  }, [dispatch]);

  const hospitals =
    user.role === 'admin'
      ? allHospitals
      : allHospitals.filter((h) => user.assigned_hospitals?.includes(h._id));

  const totalBeds = hospitals.reduce((s, h) => s + h.total_icu_beds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.available_icu_beds, 0);

  const handleBedUpdate = async (hospital) => {
    const newCount = editValues[hospital._id];
    if (newCount === undefined || newCount === hospital.available_icu_beds) return;

    if (newCount > hospital.total_icu_beds) {
      toast.error('Cannot exceed total beds');
      return;
    }

    if (newCount < 0) {
      toast.error('Cannot be negative');
      return;
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
      toast.error(result.payload || 'Update failed — please refresh and try again');
      dispatch(fetchHospitals());
    }
  };

  if (loading) return <LoadingSpinner />;

  if (hospitals.length === 0) {
    return (
      <div className="py-16 text-center">
        <Hospital className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">No hospitals assigned</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Contact your administrator to be assigned to a hospital.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          title="Full Hospitals"
          value={hospitals.filter((h) => h.available_icu_beds === 0).length}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Hospital Cards */}
      <div className="mt-6 space-y-4">
        {hospitals.map((hospital) => {
          const editValue = editValues[hospital._id];
          const hasChange =
            editValue !== undefined && parseInt(editValue) !== hospital.available_icu_beds;

          return (
            <div key={hospital._id} className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{hospital.name}</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hospital.address}</p>
                </div>

                {hospital.available_icu_beds === 0 ? (
                  <span className="badge-red">Full</span>
                ) : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2 ? (
                  <span className="badge-yellow">Low</span>
                ) : (
                  <span className="badge-green">Available</span>
                )}
              </div>

              {/* Bed availability bar */}
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

              {/* Update form */}
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap dark:text-gray-300">
                  Available Beds:
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

              {hospital.version > 0 && (
                <p className="mt-2 text-xs text-gray-400">Version: {hospital.version}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
