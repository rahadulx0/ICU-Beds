import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Map from '../components/Map';
import BedHistoryChart from '../components/BedHistoryChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ReviewList from '../components/ReviewList';
import { MapPin, Phone, Mail, Bed, Users, ArrowLeft } from 'lucide-react';

export default function HospitalDetail() {
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/hospitals/${id}`);
        setHospital(data);
      } catch {
        setHospital(null);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!hospital) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400">Hospital not found</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">Back to Map</Link>
      </div>
    );
  }

  const utilizationPercent = hospital.total_icu_beds > 0
    ? Math.round(((hospital.total_icu_beds - hospital.available_icu_beds) / hospital.total_icu_beds) * 100)
    : 0;

  const statusColor = hospital.available_icu_beds === 0
    ? 'red'
    : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2
      ? 'amber'
      : 'emerald';

  const barColor = hospital.available_icu_beds === 0
    ? 'bg-red-500'
    : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const textColor = hospital.available_icu_beds === 0
    ? 'text-red-600 dark:text-red-400'
    : hospital.available_icu_beds / hospital.total_icu_beds <= 0.2
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Map
      </Link>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{hospital.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              {hospital.address}
            </p>
          </div>
          <span className={`badge badge-${statusColor}`}>
            {hospital.status || 'active'}
          </span>
        </div>

        {/* Map */}
        <Map
          hospitals={[hospital]}
          className="mt-4 h-64 rounded-xl overflow-hidden"
        />

        {/* Bed Availability */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bed className="h-5 w-5" />
            ICU Bed Availability
          </h2>
          <div className="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{hospital.available_icu_beds}</span>
                <span className="text-lg text-gray-500 dark:text-gray-400"> / {hospital.total_icu_beds}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Utilization</p>
                <p className={`text-2xl font-bold ${textColor}`}>{utilizationPercent}%</p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full rounded-full ${barColor} transition-all`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bed History Chart */}
        <div className="mt-6">
          <BedHistoryChart hospitalId={hospital._id} hospitalName={hospital.name} />
        </div>

        {/* Contact */}
        {hospital.contact && (hospital.contact.phone || hospital.contact.email) && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
            <div className="mt-2 space-y-2">
              {hospital.contact.phone && (
                <a href={`tel:${hospital.contact.phone}`} className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 min-h-[44px]">
                  <Phone className="h-4 w-4" />
                  {hospital.contact.phone}
                </a>
              )}
              {hospital.contact.email && (
                <a href={`mailto:${hospital.contact.email}`} className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 min-h-[44px]">
                  <Mail className="h-4 w-4" />
                  {hospital.contact.email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Reviews */}
        <ReviewList hospitalId={hospital._id} />

        {/* Managed By */}
        {hospital.managed_by?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Staff
            </h2>
            <div className="mt-2 space-y-2">
              {hospital.managed_by.map((u) => (
                <div key={u._id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {u.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email} - {u.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
