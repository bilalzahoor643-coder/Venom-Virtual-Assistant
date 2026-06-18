import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiMapPin2Fill, RiCloseLine, RiRouteFill, RiTimeLine } from 'react-icons/ri'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const PremiumIcon = (color: string) =>
  L.divIcon({
    className: 'custom-premium-marker',
    html: `<div style="
    width: 28px; 
    height: 44px; 
    background-color: ${color}; 
    border-radius: 8px 8px 0 0; 
    border: 3px solid white; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.5)
  ">
    <div style="
      width: 10px; 
      height: 10px; 
      background-color: white; 
      border-radius: 50%; 
    "></div>
  </div>`,
    iconSize: [28, 44],
    iconAnchor: [14, 44],
    popupAnchor: [0, -38]
  })

export default function LeafletMapWidget() {
  const [mapData, setMapData] = useState<any>(null)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.Layer[]>([])

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleMapUpdate = (_event: any, data: any) => {
      setMapData({ mode: 'point', ...data })
    }

    const handleMapRoute = (_event: any, data: any) => {
      setMapData({ mode: 'route', ...data })
    }

    window.electron.ipcRenderer.on('map-update', handleMapUpdate)
    window.electron.ipcRenderer.on('map-route', handleMapRoute)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('map-update')
      window.electron.ipcRenderer.removeAllListeners('map-route')
    }
  }, [])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!mapData || !container) return

    if ((container as any)._leaflet_id) {
      ;(container as any)._leaflet_id = null
    }

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false
    }).setView([20.5937, 78.9629], 5)

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20
    }).addTo(map)

    mapInstanceRef.current = map

    const resizeTimer = setTimeout(() => {
      map.invalidateSize()
    }, 400)

    return () => {
      clearTimeout(resizeTimer)
      map.remove()
      mapInstanceRef.current = null
    }
  }, [mapData ? true : false])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapData) return

    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current = []

    try {
      if (mapData.mode === 'point' && mapData.lat && mapData.lng) {
        map.flyTo([mapData.lat, mapData.lng], 14, { duration: 1.5 })

        const marker = L.marker([mapData.lat, mapData.lng], { icon: PremiumIcon('#2563eb') })
          .bindPopup(
            `<strong style="font-family: sans-serif; font-size: 14px;">${mapData.name || 'Target Location'}</strong>`
          )
          .addTo(map)

        layersRef.current.push(marker)
      } else if (mapData.mode === 'route' && mapData.start && mapData.end && mapData.path) {
        const startMarker = L.marker(mapData.start, { icon: PremiumIcon('#2563eb') })
          .bindPopup(`Origin: ${mapData.info?.origin || 'Start'}`)
          .addTo(map)

        const endMarker = L.marker(mapData.end, { icon: PremiumIcon('#ef4444') })
          .bindPopup(`Destination: ${mapData.info?.destination || 'End'}`)
          .addTo(map)

        const routeLine = L.polyline(mapData.path, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map)

        layersRef.current.push(startMarker, endMarker, routeLine)

        if (mapData.path.length > 0) {
          map.fitBounds(routeLine.getBounds(), { padding: [60, 60], duration: 1.5 })
        }
      }
    } catch (err) {
      console.error('[Map Rendering Error]:', err)
    }
  }, [mapData])

  const closeMap = () => setMapData(null)

  return (
    <AnimatePresence>
      {mapData && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-8 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full h-full max-w-6xl max-h-[85vh] bg-white border border-white/20 rounded-4xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="absolute top-4 left-4 right-4 lg:top-6 lg:left-6 lg:right-6 z-1000 flex justify-between items-start pointer-events-none">
              <div className="bg-black/90 backdrop-blur-xl border border-white/10 px-5 py-3.5 rounded-2xl pointer-events-auto shadow-2xl flex items-center gap-4">
                {mapData.mode === 'route' ? (
                  <>
                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/20">
                      <RiRouteFill size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-white font-bold text-sm tracking-wide">
                        {mapData.info?.origin} <span className="text-zinc-500 mx-2">→</span>{' '}
                        {mapData.info?.destination}
                      </h2>
                      <div className="flex items-center gap-3 text-xs font-mono mt-1">
                        <span className="text-blue-400 flex items-center gap-1 font-semibold">
                          <RiMapPin2Fill size={12} /> {mapData.info?.distance}
                        </span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-blue-400 flex items-center gap-1 font-semibold">
                          <RiTimeLine size={12} /> {mapData.info?.duration}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/20">
                      <RiMapPin2Fill size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                        Target Location
                      </span>
                      <h2 className="text-white font-bold text-base tracking-wide">
                        {mapData.name}
                      </h2>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={closeMap}
                className="bg-black/90 backdrop-blur-xl border border-white/10 hover:border-red-500/50 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 p-3.5 rounded-2xl pointer-events-auto transition-all shadow-2xl cursor-pointer"
              >
                <RiCloseLine size={24} />
              </button>
            </div>

            <div
              ref={mapContainerRef}
              className="flex-1 w-full bg-[#e5e3df] z-0"
              style={{ width: '100%', height: '100%' }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
