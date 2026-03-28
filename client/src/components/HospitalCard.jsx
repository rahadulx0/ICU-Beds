import { Bed, MapPin, Phone, Navigation } from 'lucide-react';
import { BedBadge } from './Map';

export default function HospitalCard({ hospital, onSelect, onRequestAmbulance, compact }) {
  const { available_icu_beds, total_icu_beds } = hospital;

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(hospital)}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary-200 hover:shadow-sm active:scale-[0.99] dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-primary-700"
      >
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            available_icu_beds === 0
              ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              : available_icu_beds / total_icu_beds <= 0.2
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
          }`}
        >
          {available_icu_beds}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{hospital.name}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {hospital.address || `${available_icu_beds} / ${total_icu_beds} beds`}
          </p>
        </div>
        <BedBadge available={available_icu_beds} total={total_icu_beds} />
      </button>
    );
  }

  return (
    <div className="card transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{hospital.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {hospital.address}
          </p>
        </div>
        <BedBadge available={available_icu_beds} total={total_icu_beds} />
      </div>

      <div className="mt-4 flex items-center gap-6">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{available_icu_beds}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available of {total_icu_beds}</p>
        </div>

        {/* Bed availability bar */}
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                available_icu_beds === 0
                  ? 'bg-red-500'
                  : available_icu_beds / total_icu_beds <= 0.2
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{
                width: `${total_icu_beds > 0 ? (available_icu_beds / total_icu_beds) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {hospital.contact?.phone && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Phone className="h-3.5 w-3.5" />
          {hospital.contact.phone}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => onSelect?.(hospital)} className="btn-secondary flex-1 text-sm">
          <MapPin className="h-4 w-4" />
          View on Map
        </button>
        {onRequestAmbulance && (
          <button
            onClick={() => onRequestAmbulance(hospital)}
            className="btn-primary flex-1 text-sm"
          >
            <Navigation className="h-4 w-4" />
            Request Ambulance
          </button>
        )}
      </div>
    </div>
  );
}
