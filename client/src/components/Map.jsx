import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Phone, Bed, MapPin, Navigation, Plus, Search, X, Loader2 } from 'lucide-react';

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

// --- POI Tags (hospitals, pharmacies, mosques from OpenStreetMap) ---

const poiConfig = {
  hospital: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="4" y="1" width="2" height="8" rx="0.5" fill="#dc2626"/><rect x="1" y="4" width="8" height="2" rx="0.5" fill="#dc2626"/></svg>' },
  pharmacy: { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', icon: '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="3" width="8" height="4" rx="2" fill="#059669"/><rect x="4" y="0.5" width="2" height="3" rx="0.5" fill="#059669"/></svg>' },
  mosque: { color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', icon: '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1C3 1 1.5 3 1.5 5a3.5 3.5 0 005.5 2.87A4 4 0 015 1z" fill="#0891b2"/><circle cx="7" cy="2.5" r="1" fill="#0891b2"/></svg>' },
};

const createPOITagIcon = (type, name) => {
  const cfg = poiConfig[type] || poiConfig.hospital;
  const display = name.length > 18 ? name.substring(0, 16) + '\u2026' : name;

  return L.divIcon({
    className: 'poi-tag-marker',
    html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 4px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);font-size:10px;font-family:Inter,system-ui,sans-serif;white-space:nowrap;color:${cfg.color};font-weight:600;line-height:14px;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;width:14px;height:14px;flex-shrink:0;">${cfg.icon}</span><span>${display}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 8],
  });
};

function POITags() {
  const map = useMap();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [pois, setPois] = useState([]);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const fetchPOIs = useCallback(async () => {
    const zoom = map.getZoom();
    if (zoom < 14) {
      setPois([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const b = map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
    const query = `[out:json][timeout:10];(node["amenity"="hospital"](${bbox});way["amenity"="hospital"](${bbox});node["amenity"="pharmacy"](${bbox});way["amenity"="pharmacy"](${bbox});node["amenity"="place_of_worship"]["religion"="muslim"](${bbox});way["amenity"="place_of_worship"]["religion"="muslim"](${bbox}););out center;`;

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      const data = await res.json();

      const nameKey = lang === 'bn' ? 'name:bn' : 'name:en';
      const results = (data.elements || [])
        .map((el) => {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          const name = el.tags?.[nameKey] || el.tags?.name;
          if (!lat || !lon || !name) return null;

          let type = 'hospital';
          if (el.tags.amenity === 'pharmacy') type = 'pharmacy';
          else if (el.tags.amenity === 'place_of_worship') type = 'mosque';

          return { id: el.id, lat, lon, name, type };
        })
        .filter(Boolean)
        .slice(0, 120);

      setPois(results);
    } catch (err) {
      if (err.name !== 'AbortError') setPois([]);
    }
  }, [map, lang]);

  useMapEvents({
    moveend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchPOIs, 800);
    },
  });

  useEffect(() => {
    fetchPOIs();
    return () => {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchPOIs]);

  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={`poi-${poi.type}-${poi.id}`}
          position={[poi.lat, poi.lon]}
          icon={createPOITagIcon(poi.type, poi.name)}
          zIndexOffset={-1000}
          interactive={false}
        />
      ))}
    </>
  );
}

// --- Map Search ---

function MapSearch() {
  const map = useMap();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1&accept-language=${lang}`
      );
      const data = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, [lang]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    map.flyTo([lat, lng], 16, { duration: 1.5 });
    setQuery(item.display_name.split(',').slice(0, 2).join(','));
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="absolute left-3 top-3 z-[1000] w-72 sm:w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={lang === 'bn' ? 'মানচিত্রে অবস্থান খুঁজুন...' : 'Search location on map...'}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm shadow-lg placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary-500 dark:focus:ring-primary-900/30"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {!searching && query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800">
          {results.map((item, i) => (
            <button
              key={item.place_id || i}
              onClick={() => handleSelect(item)}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
              <span className="text-gray-700 dark:text-gray-200 line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  showSearch = false,
  showPOI = false,
  className = '',
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
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
          key={lang}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={
            lang === 'bn'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
        />

        {showSearch && <MapSearch />}
        {showPOI && <POITags />}
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

      {/* POI legend */}
      {showPOI && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2 rounded-lg bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm dark:bg-gray-800/90">
          {[
            { label: lang === 'bn' ? 'হাসপাতাল' : 'Hospital', color: '#dc2626' },
            { label: lang === 'bn' ? 'ফার্মেসি' : 'Pharmacy', color: '#059669' },
            { label: lang === 'bn' ? 'মসজিদ' : 'Mosque', color: '#0891b2' },
          ].map((item) => (
            <span key={item.color} className="flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-300">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

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
            <div className="absolute right-14 top-3 z-[1000] max-w-[calc(100%-8rem)] rounded-lg bg-black/75 px-3 py-2 text-xs font-medium text-white shadow-lg sm:max-w-none">
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
