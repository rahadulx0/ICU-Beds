import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import api from '../api'
import socket from '../socket'
import { useTheme } from '../contexts/ThemeContext'

function getMarkerColor(available) {
  if (available > 5) return '#10b981'
  if (available >= 1) return '#f59e0b'
  return '#ef4444'
}

function getMarkerGlow(available) {
  if (available > 5) return 'rgba(16,185,129,0.35)'
  if (available >= 1) return 'rgba(245,158,11,0.35)'
  return 'rgba(239,68,68,0.35)'
}

function getStatusText(available) {
  if (available > 5) return 'Available'
  if (available >= 1) return 'Limited'
  return 'Full'
}

function formatTimestamp(ts) {
  if (!ts) return 'Unknown'
  return new Date(ts).toLocaleString()
}

const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
}

export default function Map() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const { dark } = useTheme()
  const [hospitals, setHospitals] = useState([])
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: dark ? MAP_STYLES.dark : MAP_STYLES.light,
      center: [90.4125, 23.8103],
      zoom: 7,
      attributionControl: false
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update map style on theme change
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(dark ? MAP_STYLES.dark : MAP_STYLES.light)
  }, [dark])

  // Fetch hospitals from API + real-time via Socket.IO
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const data = await api.get('/hospitals')
        setHospitals(data)
      } catch {
        setHospitals([])
      }
    }

    fetchHospitals()

    // Real-time updates
    const onUpdate = (hospital) => {
      setHospitals(prev => prev.map(h => h.id === hospital.id ? hospital : h))
    }
    const onCreate = (hospital) => {
      setHospitals(prev => [...prev, hospital])
    }
    const onDelete = (id) => {
      setHospitals(prev => prev.filter(h => h.id !== id))
    }

    socket.on('hospital:update', onUpdate)
    socket.on('hospital:create', onCreate)
    socket.on('hospital:delete', onDelete)

    return () => {
      socket.off('hospital:update', onUpdate)
      socket.off('hospital:create', onCreate)
      socket.off('hospital:delete', onDelete)
    }
  }, [])

  // Render markers
  useEffect(() => {
    if (!mapRef.current) return

    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    const filtered = hospitals.filter(h => {
      const matchesSearch = !search || h.name?.toLowerCase().includes(search.toLowerCase()) || h.address?.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = selectedFilter === 'all' ||
        (selectedFilter === 'available' && h.available_beds > 5) ||
        (selectedFilter === 'limited' && h.available_beds >= 1 && h.available_beds <= 5) ||
        (selectedFilter === 'full' && h.available_beds === 0)
      return matchesSearch && matchesFilter
    })

    filtered.forEach(h => {
      const lat = h.coordinates?.lat ?? 0
      const lng = h.coordinates?.lng ?? 0
      if (!lat && !lng) return

      const color = getMarkerColor(h.available_beds ?? 0)
      const glow = getMarkerGlow(h.available_beds ?? 0)
      const status = getStatusText(h.available_beds ?? 0)
      const bedsAvail = h.available_beds ?? 0

      const el = document.createElement('div')
      el.style.cssText = 'width:44px;height:44px;cursor:pointer;position:relative;'
      el.innerHTML = `
        <div style="position:absolute;inset:0;border-radius:50%;background:${glow};animation:pulse-ring 2s ease-out infinite;"></div>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:relative;filter:drop-shadow(0 2px 6px ${glow});">
          <circle cx="22" cy="22" r="17" fill="${color}" opacity="0.18"/>
          <circle cx="22" cy="22" r="11" fill="${color}" opacity="0.4"/>
          <circle cx="22" cy="22" r="7" fill="${color}" stroke="white" stroke-width="2.5"/>
          <text x="22" y="25" text-anchor="middle" font-size="8" font-weight="800" fill="white">${bedsAvail}</text>
        </svg>
      `

      const popupContent = `
        <div style="min-width:260px;font-family:system-ui,sans-serif;border-radius:16px;overflow:hidden;">
          <div style="padding:16px 18px;background:linear-gradient(135deg,${color}22,${color}08);border-bottom:1px solid ${color}25;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${glow};"></div>
              <div style="font-weight:700;font-size:14px;color:var(--color-text,#0f172a);">${h.name || 'Hospital'}</div>
            </div>
            <div style="font-size:12px;color:var(--color-text-secondary,#64748b);margin-top:4px;padding-left:16px;">${h.address || 'Address not available'}</div>
          </div>
          <div style="padding:14px 18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <span style="font-size:11px;font-weight:600;color:var(--color-text-muted,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">Status</span>
              <span style="font-size:12px;font-weight:700;color:${color};background:${color}18;padding:3px 12px;border-radius:99px;border:1px solid ${color}30;">${status}</span>
            </div>
            <div style="display:flex;gap:10px;">
              <div style="flex:1;background:linear-gradient(135deg,${color}12,${color}06);border:1px solid ${color}20;border-radius:12px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:${color};line-height:1;">${bedsAvail}</div>
                <div style="font-size:10px;font-weight:600;color:var(--color-text-muted,#94a3b8);margin-top:4px;text-transform:uppercase;letter-spacing:0.3px;">Available</div>
              </div>
              <div style="flex:1;background:var(--color-surface-hover,#f1f5f9);border:1px solid var(--color-border,#e2e8f0);border-radius:12px;padding:12px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:var(--color-text,#0f172a);line-height:1;">${h.total_beds ?? 0}</div>
                <div style="font-size:10px;font-weight:600;color:var(--color-text-muted,#94a3b8);margin-top:4px;text-transform:uppercase;letter-spacing:0.3px;">Total</div>
              </div>
            </div>
            <div style="margin-top:12px;font-size:10px;color:var(--color-text-muted,#94a3b8);text-align:right;font-style:italic;">
              Updated: ${formatTimestamp(h.last_updated)}
            </div>
          </div>
        </div>
      `

      const popup = new maplibregl.Popup({ offset: 24, maxWidth: '320px', className: 'icu-popup' })
        .setHTML(popupContent)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current)

      markersRef.current[h.id] = marker
    })
  }, [hospitals, search, selectedFilter, dark])

  const stats = {
    total: hospitals.length,
    available: hospitals.filter(h => h.available_beds > 5).length,
    limited: hospitals.filter(h => h.available_beds >= 1 && h.available_beds <= 5).length,
    full: hospitals.filter(h => h.available_beds === 0).length,
    totalBeds: hospitals.reduce((s, h) => s + (h.available_beds ?? 0), 0)
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Search & Filter Panel */}
      <div className="absolute top-[76px] left-3 right-3 sm:left-4 sm:right-auto sm:w-[360px] lg:w-[380px] z-10">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-black/[0.08] dark:shadow-black/30 border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Search input */}
          <div className="p-3 pb-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search hospitals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-600/80 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              />
              <button
                onClick={() => setPanelCollapsed(!panelCollapsed)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 sm:hidden"
              >
                <svg className={`w-4 h-4 transition-transform ${panelCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>

          {!panelCollapsed && (
            <>
              <div className="px-3 pb-2.5 flex gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: 'All', count: stats.total, dot: null },
                  { key: 'available', label: 'Available', count: stats.available, dot: 'bg-emerald-500' },
                  { key: 'limited', label: 'Limited', count: stats.limited, dot: 'bg-yellow-500' },
                  { key: 'full', label: 'Full', count: stats.full, dot: 'bg-red-500' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      selectedFilter === f.key
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/60'
                    }`}
                  >
                    {f.dot && <span className={`w-2 h-2 rounded-full ${selectedFilter === f.key ? 'bg-white/70' : f.dot}`} />}
                    {f.label}
                    <span className={`font-semibold ${selectedFilter === f.key ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total available beds</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.totalBeds}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-3 sm:left-4 z-10">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg shadow-black/[0.08] dark:shadow-black/30 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5">
          <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Legend</div>
          <div className="flex gap-3.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              <span className="text-slate-600 dark:text-slate-300">&gt;5 beds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 ring-2 ring-yellow-500/20" />
              <span className="text-slate-600 dark:text-slate-300">1-5 beds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />
              <span className="text-slate-600 dark:text-slate-300">0 beds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
