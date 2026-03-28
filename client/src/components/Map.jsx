import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Phone, Bed, MapPin, Navigation, Plus } from 'lucide-react';

// Fix default leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createHospitalIcon = (available, total) => {
  const ratio = total > 0 ? available / total : 0;
  let color, bg;

  if (available === 0) {
    color = '#dc2626';
    bg = '#fef2f2';
  } else if (ratio <= 0.2) {
    color = '#f59e0b';
    bg = '#fffbeb';
  } else {
    color = '#059669';
    bg = '#ecfdf5';
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${bg};
        border: 3px solid ${color};
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-weight: 700;
        font-size: 13px;
        color: ${color};
        font-family: Inter, system-ui, sans-serif;
      ">${available}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
};

const createDriverIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid #1d4ed8;
        box-shadow: 0 2px 8px rgba(59,130,246,0.4);
        color: white;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6366f1;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(99,102,241,0.4);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

function FitBounds({ hospitals }) {
  const map = useMap();

  useEffect(() => {
    try {
      const valid = hospitals.filter((h) => h.location?.coordinates?.length === 2);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(
          valid.map((h) => [h.location.coordinates[1], h.location.coordinates[0]])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    } catch {
      // Map may not be ready (e.g., hidden container)
    }
  }, [hospitals, map]);

  return null;
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    try {
      if (position) {
        map.flyTo(position, 15, { duration: 1.5 });
      }
    } catch {
      // Map may not be ready (e.g., hidden container)
    }
  }, [position, map]);
  return null;
}

function MapClickHandler({ active, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    try {
      if (active) {
        map.getContainer().style.cursor = 'crosshair';
      } else {
        map.getContainer().style.cursor = '';
      }
      return () => {
        try { map.getContainer().style.cursor = ''; } catch { /* noop */ }
      };
    } catch {
      // Map container may not be accessible
    }
  }, [active, map]);

  useMapEvents({
    click(e) {
      if (active) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  return null;
}

const createAddPinIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #7c3aed;
        border: 3px solid #5b21b6;
        box-shadow: 0 2px 12px rgba(124,58,237,0.5);
        color: white;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function Map({
  hospitals = [],
  driverLocation,
  userLocation,
  selectedHospital,
  onHospitalClick,
  onRequestAmbulance,
  onAddHospital,
  showUser = false,
  className = '',
}) {
  const mapRef = useRef(null);
  const [addMode, setAddMode] = useState(false);
  const [pinPosition, setPinPosition] = useState(null);

  const defaultCenter = [23.7461, 90.3742]; // Dhaka
  const defaultZoom = 12;

  const flyToPosition = useMemo(() => {
    if (selectedHospital?.location?.coordinates?.length === 2) {
      return [
        selectedHospital.location.coordinates[1],
        selectedHospital.location.coordinates[0],
      ];
    }
    return null;
  }, [selectedHospital]);

  const handleMapClick = (coords) => {
    setPinPosition(coords);
    setAddMode(false);
    onAddHospital?.(coords);
  };

  const cancelAddMode = () => {
    setAddMode(false);
    setPinPosition(null);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler active={addMode} onMapClick={handleMapClick} />

        {hospitals.length > 0 && !selectedHospital && <FitBounds hospitals={hospitals} />}
        {flyToPosition && <FlyTo position={flyToPosition} />}

        {/* Hospital markers */}
        {hospitals.filter((h) => h.location?.coordinates?.length === 2).map((hospital) => (
          <Marker
            key={hospital._id}
            position={[hospital.location.coordinates[1], hospital.location.coordinates[0]]}
            icon={createHospitalIcon(hospital.available_icu_beds, hospital.total_icu_beds)}
            eventHandlers={{
              click: () => onHospitalClick?.(hospital),
            }}
          >
            <Popup>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900">{hospital.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {hospital.address}
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Bed className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      {hospital.available_icu_beds}
                    </span>
                    <span className="text-xs text-gray-500">/ {hospital.total_icu_beds}</span>
                  </div>
                  <BedBadge available={hospital.available_icu_beds} total={hospital.total_icu_beds} />
                </div>

                {hospital.contact?.phone && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    {hospital.contact.phone}
                  </p>
                )}

                {onRequestAmbulance && (
                  <button
                    onClick={() => onRequestAmbulance(hospital)}
                    className="btn-primary mt-3 w-full text-xs"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Request Ambulance
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Placed pin for new hospital */}
        {pinPosition && (
          <Marker
            position={[pinPosition.lat, pinPosition.lng]}
            icon={createAddPinIcon()}
          />
        )}

        {/* Driver location */}
        {driverLocation && (
          <Marker
            position={[driverLocation.latitude, driverLocation.longitude]}
            icon={createDriverIcon()}
          >
            <Popup>
              <div className="p-2 text-sm font-medium">Ambulance Location</div>
            </Popup>
          </Marker>
        )}

        {/* User location */}
        {showUser && userLocation && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createUserIcon()}
            />
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={100}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Admin add hospital button */}
      {onAddHospital && (
        <>
          <button
            onClick={() => {
              if (addMode) {
                cancelAddMode();
              } else {
                setPinPosition(null);
                setAddMode(true);
              }
            }}
            className={`absolute right-3 top-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all ${
              addMode
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
            title={addMode ? 'Cancel' : 'Add Hospital'}
          >
            <Plus className={`h-5 w-5 transition-transform ${addMode ? 'rotate-45' : ''}`} />
          </button>

          {addMode && (
            <div className="absolute right-14 top-3 z-[1000] rounded-lg bg-black/75 px-3 py-2 text-xs font-medium text-white shadow-lg">
              Click on the map to place hospital
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BedBadge({ available, total }) {
  if (available === 0) return <span className="badge-red">No beds</span>;
  const ratio = total > 0 ? available / total : 0;
  if (ratio <= 0.2) return <span className="badge-yellow">Low</span>;
  return <span className="badge-green">Available</span>;
}

export { BedBadge, createHospitalIcon, createDriverIcon };
