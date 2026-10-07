import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  KmlDocument,
  PlacemarkFeature,
  LatLng,
  TravelMode,
  RouteResultDetails,
  RouteStep,
  RouteAlternative,
  LiveNavigationState,
} from '../types/kml';
import { TrackedSatelliteDevice } from '../types/tracker';
import {
  Navigation,
  Maximize2,
  Layers,
  Printer,
  Compass,
  MapPin,
  Flag,
  Share2,
  ExternalLink,
  X,
  HardDrive,
} from 'lucide-react';
import { createWhatsAppUrl } from '../utils/pdfGenerator';
import { ActiveRouteOverlay } from './ActiveRouteOverlay';
import {
  parseOsrmSteps,
  generateOfflineSteps,
  generateOfflineAlternatives,
  extractHighwaysFromSteps,
  buildHighwaySummary,
  inferOfflineHighways,
  findUpcomingManeuver,
  calculateBearing,
  formatDistance,
  formatDuration,
} from '../utils/routeGuidance';

interface LeafletMapViewProps {
  filteredPlacemarks: PlacemarkFeature[];
  selectedPlacemark: PlacemarkFeature | null;
  origin: LatLng | null;
  originLabel: string;
  destination: LatLng | null;
  destinationLabel: string;
  travelMode: TravelMode;
  routeDetails: RouteResultDetails | null;
  isPickingOnMap: boolean;
  kmlDoc: KmlDocument;
  onSelectPlacemark: (pm: PlacemarkFeature) => void;
  onSetAsOrigin: (pm: PlacemarkFeature) => void;
  onSetAsDestination: (pm: PlacemarkFeature) => void;
  onCloseInfoWindow: () => void;
  onRouteCalculated: (d: RouteResultDetails | null) => void;
  onRouteError: (err: string | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onClearRoute: () => void;
  onMapClickPoint: (pt: LatLng) => void;
  onDragDeparture: (pt: LatLng) => void;
  onOpenPrintModal: () => void;
  onOpenOfflineModal: () => void;
  onSelectAlternative?: (index: number) => void;
  trackedDevices?: TrackedSatelliteDevice[];
  activeTrackedDevice?: TrackedSatelliteDevice | null;
  userLocation?: LatLng | null;
  onSelectTrackedDevice?: (device: TrackedSatelliteDevice) => void;
  onNavigateToDevice?: (device: TrackedSatelliteDevice) => void;
}

// Distance helper
function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}

export function LeafletMapView({
  filteredPlacemarks,
  selectedPlacemark,
  origin,
  originLabel,
  destination,
  destinationLabel,
  travelMode,
  routeDetails,
  isPickingOnMap,
  kmlDoc,
  onSelectPlacemark,
  onSetAsOrigin,
  onSetAsDestination,
  onCloseInfoWindow,
  onRouteCalculated,
  onRouteError,
  onRouteLoadingChange,
  onClearRoute,
  onMapClickPoint,
  onDragDeparture,
  onOpenPrintModal,
  onOpenOfflineModal,
  onSelectAlternative: onSelectAlternativeProp,
  trackedDevices = [],
  activeTrackedDevice = null,
  userLocation = null,
  onSelectTrackedDevice,
  onNavigateToDevice,
}: LeafletMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const shapesLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const satelliteLayerRef = useRef<L.LayerGroup | null>(null);
  const departureMarkerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.CircleMarker | null>(null);

  // Live Real-Time Navigation State
  const [isLiveNavigating, setIsLiveNavigating] = useState(false);
  const [liveNavState, setLiveNavState] = useState<LiveNavigationState>({
    isActive: false,
    currentLocation: null,
    heading: null,
    speedKmh: null,
    altitude: null,
    accuracy: null,
    remainingDistanceMeters: null,
    remainingDurationSeconds: null,
    nextStep: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const prevPosRef = useRef<LatLng | null>(null);
  const prevTimeRef = useRef<number>(0);
  const liveVehicleMarkerRef = useRef<L.Marker | null>(null);
  const liveAccuracyCircleRef = useRef<L.Circle | null>(null);
  const breadcrumbLineRef = useRef<L.Polyline | null>(null);
  const breadcrumbsRef = useRef<[number, number][]>([]);

  // Track navigation state in ref to avoid stale closures and unwanted zoom resets
  const isLiveNavigatingRef = useRef(isLiveNavigating);
  isLiveNavigatingRef.current = isLiveNavigating;

  // Cached alternatives & last calculation key to prevent re-fetching and resets
  const calculatedAlternativesRef = useRef<RouteAlternative[]>([]);
  const selectedAltIndexRef = useRef<number>(0);
  const lastCalcRouteKeyRef = useRef<string>('');

  const [mapType, setMapType] = useState<'streets' | 'topo' | 'satellite'>('streets');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Stop live navigation and cleanup markers/watchers
  const handleStopLiveNav = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (liveVehicleMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(liveVehicleMarkerRef.current);
      liveVehicleMarkerRef.current = null;
    }
    if (liveAccuracyCircleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(liveAccuracyCircleRef.current);
      liveAccuracyCircleRef.current = null;
    }
    if (breadcrumbLineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(breadcrumbLineRef.current);
      breadcrumbLineRef.current = null;
    }
    breadcrumbsRef.current = [];
    prevPosRef.current = null;
    prevTimeRef.current = 0;
    setIsLiveNavigating(false);
    setLiveNavState({
      isActive: false,
      currentLocation: null,
      heading: null,
      speedKmh: null,
      altitude: null,
      accuracy: null,
      remainingDistanceMeters: null,
      remainingDurationSeconds: null,
      nextStep: null,
    });
  }, []);

  const handleStopLiveNavRef = useRef(handleStopLiveNav);
  useEffect(() => {
    handleStopLiveNavRef.current = handleStopLiveNav;
  }, [handleStopLiveNav]);

  const onMapClickPointRef = useRef(onMapClickPoint);
  useEffect(() => {
    onMapClickPointRef.current = onMapClickPoint;
  }, [onMapClickPoint]);

  // SVG fallback tile displayed when user is offline and tile was not pre-cached
  const errorTileFallback =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%230f172a" stroke="%231e293b" stroke-width="1"/><path d="M60 128h136M128 60v136" stroke="%231e293b" stroke-width="0.5"/><text x="128" y="125" fill="%2364748b" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Modo Offline</text><text x="128" y="142" fill="%23475569" font-family="sans-serif" font-size="9" text-anchor="middle">Conecte para baixar</text></svg>';

  // Initialize Map ONCE on mount without tearing it down on state changes
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = origin ? [origin.lat, origin.lng] : [-14.235, -51.9253];
    const initialZoom = origin ? 14 : 4;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Create high-visibility route pane so the blue highway line is always clearly on top
    const routePane = map.createPane('routePane');
    routePane.style.zIndex = '520';

    // Custom dark / modern tile layer with offline fallback
    const standardLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
        errorTileUrl: errorTileFallback,
      }
    ).addTo(map);

    tileLayerRef.current = standardLayer;

    // Layer groups
    shapesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    satelliteLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Map click handler (uses stable ref so map is never recreated)
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickPointRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      handleStopLiveNavRef.current?.();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Type Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZoom = 19;

    if (mapType === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      maxZoom = 17;
    } else if (mapType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      errorTileUrl: errorTileFallback,
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Fit bounds helper
  const handleFitBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const validPoints = filteredPlacemarks
      .map((p) => p.point)
      .filter((p): p is LatLng => p !== null);

    if (validPoints.length === 0) {
      if (trackedDevices && trackedDevices.length > 0) {
        const devPoints: LatLng[] = trackedDevices.map((d) => ({ lat: d.lat, lng: d.lng }));
        if (userLocation) devPoints.push(userLocation);
        const bounds = L.latLngBounds(devPoints.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        return;
      }
      if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
        return;
      }
      if (kmlDoc.bounds) {
        map.fitBounds([
          [kmlDoc.bounds.south, kmlDoc.bounds.west],
          [kmlDoc.bounds.north, kmlDoc.bounds.east],
        ]);
      }
      return;
    }

    const bounds = L.latLngBounds(validPoints.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [filteredPlacemarks, kmlDoc.bounds, trackedDevices, userLocation]);

  // Auto-fit on initial load or dataset change
  useEffect(() => {
    handleFitBounds();
  }, [handleFitBounds]);

  // Draw Polylines & Polygons from KML
  useEffect(() => {
    if (!shapesLayerRef.current) return;
    shapesLayerRef.current.clearLayers();

    filteredPlacemarks.forEach((pm) => {
      const color = pm.categoryColor || '#3b82f6';

      // Lines
      if (pm.lineCoordinates && pm.lineCoordinates.length > 1) {
        const latLngs: L.LatLngExpression[] = pm.lineCoordinates.map((c) => [
          c.lat,
          c.lng,
        ]);
        const polyline = L.polyline(latLngs, {
          color,
          weight: 4,
          opacity: 0.85,
        });
        polyline.on('click', () => onSelectPlacemark(pm));
        shapesLayerRef.current?.addLayer(polyline);
      }

      // Polygons
      if (pm.polygonCoordinates && pm.polygonCoordinates.length > 0) {
        const rings: L.LatLngExpression[][] = pm.polygonCoordinates.map((ring) =>
          ring.map((c) => [c.lat, c.lng])
        );
        const polygon = L.polygon(rings, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.25,
        });
        polygon.on('click', () => onSelectPlacemark(pm));
        shapesLayerRef.current?.addLayer(polygon);
      }
    });
  }, [filteredPlacemarks, onSelectPlacemark]);

  // Draw Placemark Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    filteredPlacemarks.forEach((pm) => {
      if (!pm.point) return;

      const isSelected = selectedPlacemark?.id === pm.id;
      const isOrigin = origin && pm.point.lat === origin.lat && pm.point.lng === origin.lng;
      const isDest = destination && pm.point.lat === destination.lat && pm.point.lng === destination.lng;

      const color = isOrigin
        ? '#059669'
        : isDest
        ? '#e11d48'
        : isSelected
        ? '#2563eb'
        : pm.categoryColor || '#3b82f6';

      const size = isSelected ? 38 : isOrigin || isDest ? 36 : 28;
      const height = Math.round(size * 1.3);

      const pinHtml = `
        <div style="position: relative; width: ${size}px; height: ${height}px; transform: translate(-50%, -100%); cursor: pointer;">
          <svg width="${size}" height="${height}" viewBox="0 0 32 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
            <path d="M16 1 C7.716 1 1 7.716 1 16 C1 25.5 16 40 16 40 C16 40 31 25.5 31 16 C31 7.716 24.284 1 16 1 Z" 
                  fill="${color}" stroke="#ffffff" stroke-width="${isSelected ? 2.5 : 2}"/>
            <circle cx="16" cy="15" r="${isSelected ? 6.5 : 5.5}" fill="#ffffff"/>
            ${
              isOrigin
                ? `<path d="M16 10 L19 18 L16 16.5 L13 18 Z" fill="${color}"/>`
                : isDest
                ? `<path d="M13.5 10.5 H18.5 V15 H13.5 Z" fill="${color}"/>`
                : ''
            }
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-placemark-pin',
        html: pinHtml,
        iconSize: [size, height],
        iconAnchor: [size / 2, height],
      });

      const marker = L.marker([pm.point.lat, pm.point.lng], {
        icon,
        title: pm.name,
        zIndexOffset: isSelected ? 1000 : isOrigin || isDest ? 800 : 100,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPlacemark(pm);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredPlacemarks, selectedPlacemark, origin, destination, onSelectPlacemark]);

  // Render Tracked Satellite Devices on the Map
  useEffect(() => {
    if (!satelliteLayerRef.current || !mapInstanceRef.current) return;
    const layer = satelliteLayerRef.current;
    layer.clearLayers();

    if (!trackedDevices || trackedDevices.length === 0) return;

    trackedDevices.forEach((device) => {
      const isSelected = activeTrackedDevice?.id === device.id;
      const color = device.color || '#06b6d4';

      // SVG Icon based on type
      let typeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;
      if (device.type === 'vehicle') {
        typeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
      } else if (device.type === 'beacon') {
        typeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`;
      } else if (device.type === 'pet') {
        typeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2"><circle cx="12" cy="14" r="4"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/></svg>`;
      }

      // Breadcrumb history trail
      if (device.history && device.history.length > 1) {
        const trailPoints: L.LatLngExpression[] = device.history.map((h) => [h.lat, h.lng]);
        const trailLine = L.polyline(trailPoints, {
          color,
          weight: 3,
          opacity: 0.55,
          dashArray: '4, 6',
          lineCap: 'round',
        });
        layer.addLayer(trailLine);
      }

      // Animated DivIcon with sonar radar waves
      const html = `
        <div style="position: relative; width: 48px; height: 48px; transform: translate(-50%, -50%); cursor: pointer;">
          <!-- Sonar radar ring 1 -->
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${color}; opacity: ${isSelected ? 0.35 : 0.2}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <!-- Sonar radar ring 2 -->
          <div style="position: absolute; inset: -8px; border-radius: 9999px; border: 1.5px solid ${color}; opacity: ${isSelected ? 0.6 : 0.25};"></div>
          <!-- Central pod -->
          <div style="position: absolute; inset: 7px; border-radius: 9999px; background: #090d16; border: 2.5px solid ${color}; box-shadow: 0 0 14px ${color}88, inset 0 0 6px ${color}66; display: flex; align-items: center; justify-content: center; z-index: 10;">
            ${typeSvg}
          </div>
          <!-- Heading pointer if moving -->
          ${
            device.heading !== null
              ? `<div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%) rotate(${device.heading}deg); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid ${color}; z-index: 12;"></div>`
              : ''
          }
          <!-- Floating badge name -->
          <div style="position: absolute; top: 46px; left: 50%; transform: translateX(-50%); background: rgba(9, 13, 22, 0.95); color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; border: 1px solid ${color}88; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px;">
            <span style="color: ${color}; font-family: monospace;">${device.id}</span>
            <span>${device.name}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'satellite-device-pin',
        html,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([device.lat, device.lng], {
        icon,
        zIndexOffset: isSelected ? 1500 : 1300,
      });

      // Popup with live satellite telemetry and actions
      const popupContainer = document.createElement('div');
      popupContainer.style.cssText = 'min-width: 220px; font-family: sans-serif; color: #f8fafc; padding: 2px;';
      popupContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px;">
          <div>
            <div style="font-size: 13px; font-weight: bold; color: #ffffff;">${device.name}</div>
            <div style="font-size: 11px; font-family: monospace; color: #38bdf8; font-weight: bold;">ID: ${device.id}</div>
          </div>
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 9999px; background: ${device.status === 'online' ? '#065f46' : '#881337'}; color: ${device.status === 'online' ? '#6ee7b7' : '#fca5a5'}; font-weight: bold;">
            ${device.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #94a3b8; margin-bottom: 8px;">
          <div>🛰️ ${device.satellites} Satélites</div>
          <div>🔋 ${device.battery !== null ? device.battery + '%' : '85%'}</div>
          <div>🏎️ ${device.speedKmh ? device.speedKmh.toFixed(0) + ' km/h' : 'Parado'}</div>
          <div>📍 ±${device.accuracy ? device.accuracy.toFixed(1) + 'm' : '3m'}</div>
        </div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-bottom: 8px;">
          ${device.lat.toFixed(6)}, ${device.lng.toFixed(6)}
        </div>
      `;

      const navBtn = document.createElement('button');
      navBtn.style.cssText =
        'width: 100%; padding: 7px 10px; background: linear-gradient(to right, #2563eb, #06b6d4); color: #ffffff; border: none; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);';
      navBtn.innerText = '🧭 Traçar Rota até este Aparelho';
      navBtn.onclick = () => {
        onNavigateToDevice?.(device);
        marker.closePopup();
      };
      popupContainer.appendChild(navBtn);

      marker.bindPopup(popupContainer, {
        className: 'satellite-popup-dark',
        maxWidth: 260,
      });

      marker.on('click', () => {
        onSelectTrackedDevice?.(device);
      });

      layer.addLayer(marker);
    });

    // Draw Tactical Line of Sight from userLocation to activeTrackedDevice
    if (activeTrackedDevice && userLocation) {
      const dist = haversineDistance(userLocation, { lat: activeTrackedDevice.lat, lng: activeTrackedDevice.lng });
      const tacticalLine = L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [activeTrackedDevice.lat, activeTrackedDevice.lng],
        ],
        {
          color: activeTrackedDevice.color || '#06b6d4',
          weight: 2.5,
          opacity: 0.9,
          dashArray: '6, 8',
          className: 'gmaps-lead-dash',
        }
      );
      layer.addLayer(tacticalLine);

      // Midpoint distance label
      const midLat = (userLocation.lat + activeTrackedDevice.lat) / 2;
      const midLng = (userLocation.lng + activeTrackedDevice.lng) / 2;
      const distText = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(2)} km`;
      const midMarker = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'tactical-mid-dist',
          html: `<div style="background: rgba(9, 13, 22, 0.9); color: #38bdf8; border: 1px solid #0284c7; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold; transform: translate(-50%, -50%); box-shadow: 0 2px 8px rgba(0,0,0,0.5);">${distText}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        }),
      });
      layer.addLayer(midMarker);
    }
  }, [trackedDevices, activeTrackedDevice, userLocation, onSelectTrackedDevice, onNavigateToDevice]);

  // Handle Departure Marker (Draggable)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (departureMarkerRef.current) {
      map.removeLayer(departureMarkerRef.current);
      departureMarkerRef.current = null;
    }

    if (origin) {
      const pinHtml = `
        <div style="position: relative; width: 36px; height: 46px; transform: translate(-50%, -100%); cursor: grab;">
          <div style="position: absolute; -inset: 6px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <svg width="36" height="46" viewBox="0 0 34 44" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5));">
            <path d="M17 1 C8.163 1 1 8.163 1 17 C1 27.5 17 43 17 43 C17 43 33 27.5 33 17 C33 8.163 25.837 1 17 1 Z" 
                  fill="#059669" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="17" cy="16" r="7" fill="#ffffff"/>
            <circle cx="17" cy="16" r="4" fill="#059669"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-departure-pin',
        html: pinHtml,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
      });

      const depMarker = L.marker([origin.lat, origin.lng], {
        icon,
        draggable: true,
        zIndexOffset: 1200,
        title: originLabel,
      });

      depMarker.on('dragend', () => {
        const pos = depMarker.getLatLng();
        onDragDeparture({ lat: pos.lat, lng: pos.lng });
      });

      depMarker.addTo(map);
      departureMarkerRef.current = depMarker;
    }
  }, [origin, originLabel, onDragDeparture]);

  // Recenter map on user during live navigation
  const handleRecenterOnUser = useCallback(() => {
    if (liveNavState.currentLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [liveNavState.currentLocation.lat, liveNavState.currentLocation.lng],
        16,
        { animate: true }
      );
    }
  }, [liveNavState.currentLocation]);

  // Select route alternative and update map layers
  const handleSelectAlternative = useCallback(
    (index: number) => {
      const alternatives = calculatedAlternativesRef.current;
      if (!alternatives || alternatives.length === 0 || !alternatives[index]) return;

      selectedAltIndexRef.current = index;
      const selectedAlt = alternatives[index];

      // Redraw map routes
      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();

        // 1. Draw inactive alternatives as clickable muted dashed lines
        alternatives.forEach((alt, idx) => {
          if (idx !== index) {
            const altCasing = L.polyline(alt.coordinates, {
              color: '#1e293b',
              weight: 6,
              opacity: 0.5,
              pane: 'routePane',
            });
            const altLine = L.polyline(alt.coordinates, {
              color: '#64748b',
              weight: 4,
              opacity: 0.75,
              dashArray: '8, 8',
              lineCap: 'round',
              pane: 'routePane',
            });
            altLine.on('click', () => {
              handleSelectAlternative(idx);
            });
            routeLayerRef.current?.addLayer(altCasing);
            routeLayerRef.current?.addLayer(altLine);
          }
        });

        // 2. High-contrast navy casing for road separation
        const casing = L.polyline(selectedAlt.coordinates, {
          color: '#1e3a8a', // Deep Navy Blue casing
          weight: 10,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'routePane',
        });

        // 3. Vibrant Royal Blue route line (standard Google Maps navigation blue)
        const line = L.polyline(selectedAlt.coordinates, {
          color: '#2563eb', // Royal Blue (#2563eb)
          weight: 7,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
          pane: 'routePane',
        });

        // 4. GOOGLE MAPS DASHED TRAJECTORY LINE (Linha tracejada de navegação)
        // Linha branca nítida no centro da pista azul indicando a trajetória a seguir
        const trajectoryDashedLine = L.polyline(selectedAlt.coordinates, {
          color: '#ffffff', // Branco nítido exatamente como o traçado do Google Maps
          weight: 3.5,
          opacity: 1.0,
          dashArray: '8, 14',
          lineCap: 'round',
          lineJoin: 'round',
          className: 'gmaps-trajectory-dash',
          pane: 'routePane',
        });

        routeLayerRef.current.addLayer(casing);
        routeLayerRef.current.addLayer(line);
        routeLayerRef.current.addLayer(trajectoryDashedLine);
        // Garante que a linha tracejada fique sobreposta à linha azul, visível no topo
        trajectoryDashedLine.bringToFront();

        if (!isLiveNavigatingRef.current) {
          mapInstanceRef.current?.fitBounds(line.getBounds(), {
            padding: [70, 70],
          });
        }
      }

      onRouteCalculated({
        distanceMeters: selectedAlt.distanceMeters,
        durationMillis: selectedAlt.durationMillis,
        distanceText: selectedAlt.distanceText,
        durationText: selectedAlt.durationText,
        summary: selectedAlt.summary,
        highways: selectedAlt.highways,
        steps: selectedAlt.steps,
        alternatives,
        selectedAlternativeIndex: index,
      });

      if (onSelectAlternativeProp) {
        onSelectAlternativeProp(index);
      }
    },
    [onRouteCalculated, onSelectAlternativeProp]
  );

  const handleSelectAlternativeRef = useRef(handleSelectAlternative);
  useEffect(() => {
    handleSelectAlternativeRef.current = handleSelectAlternative;
  }, [handleSelectAlternative]);

  // Toggle Real-Time Live Navigation with continuous geolocation tracking
  const handleToggleLiveNavigation = useCallback(() => {
    if (isLiveNavigating) {
      handleStopLiveNav();
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocalização não é suportada pelo seu dispositivo.');
      return;
    }

    setIsLiveNavigating(true);
    breadcrumbsRef.current = [];

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const curPos: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const now = Date.now();
        const accuracy = pos.coords.accuracy || 15;
        const altitude = pos.coords.altitude || null;

        // Calculate speed (km/h)
        let speedKmh: number | null = null;
        if (pos.coords.speed !== null && pos.coords.speed > 0) {
          speedKmh = pos.coords.speed * 3.6;
        } else if (prevPosRef.current && prevTimeRef.current > 0) {
          const deltaSec = (now - prevTimeRef.current) / 1000;
          if (deltaSec > 0.5) {
            const dist = haversineDistance(prevPosRef.current, curPos);
            speedKmh = (dist / deltaSec) * 3.6;
          }
        }

        // Calculate heading (degrees 0-360)
        let heading: number | null = null;
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          heading = pos.coords.heading;
        } else if (prevPosRef.current) {
          const distMoved = haversineDistance(prevPosRef.current, curPos);
          if (distMoved > 2) {
            heading = calculateBearing(prevPosRef.current, curPos);
          }
        }

        prevPosRef.current = curPos;
        prevTimeRef.current = now;

        // Remaining metrics to destination
        let remainingDistanceMeters: number | null = null;
        let remainingDurationSeconds: number | null = null;
        if (destination) {
          remainingDistanceMeters = haversineDistance(curPos, destination);
          const currentSpeedMps = speedKmh && speedKmh > 5 ? speedKmh / 3.6 : 13.8; // ~50 km/h default
          remainingDurationSeconds = remainingDistanceMeters / currentSpeedMps;
        }

        // Upcoming maneuver from active steps
        const currentSteps = routeDetails?.steps || [];
        const upcoming = findUpcomingManeuver(curPos, currentSteps);
        const nextStep = upcoming?.step || null;

        setLiveNavState({
          isActive: true,
          currentLocation: curPos,
          heading,
          speedKmh,
          altitude,
          accuracy,
          remainingDistanceMeters,
          remainingDurationSeconds,
          nextStep,
        });

        // Update map vehicle puck & position
        const map = mapInstanceRef.current;
        if (!map) return;

        const angle = heading ?? 0;
        const puckHtml = `
          <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(37, 99, 235, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 36px; height: 36px; border-radius: 9999px; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; transform: rotate(${angle}deg); transition: transform 0.35s ease;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'live-nav-vehicle-marker',
          html: puckHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });

        if (liveVehicleMarkerRef.current) {
          liveVehicleMarkerRef.current.setLatLng([curPos.lat, curPos.lng]);
          liveVehicleMarkerRef.current.setIcon(icon);
        } else {
          liveVehicleMarkerRef.current = L.marker([curPos.lat, curPos.lng], {
            icon,
            zIndexOffset: 2000,
          }).addTo(map);
        }

        // Accuracy circle around vehicle
        if (liveAccuracyCircleRef.current) {
          liveAccuracyCircleRef.current.setLatLng([curPos.lat, curPos.lng]);
          liveAccuracyCircleRef.current.setRadius(accuracy);
        } else {
          liveAccuracyCircleRef.current = L.circle([curPos.lat, curPos.lng], {
            radius: accuracy,
            color: '#2563eb',
            weight: 1.5,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
          }).addTo(map);
        }

        // Breadcrumbs history trail
        breadcrumbsRef.current.push([curPos.lat, curPos.lng]);
        if (breadcrumbsRef.current.length > 200) {
          breadcrumbsRef.current.shift();
        }

        if (breadcrumbLineRef.current) {
          breadcrumbLineRef.current.setLatLngs(breadcrumbsRef.current);
        } else {
          breadcrumbLineRef.current = L.polyline(breadcrumbsRef.current, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
            dashArray: '4, 6',
          }).addTo(map);
        }

        // Auto follow user
        map.panTo([curPos.lat, curPos.lng], { animate: true, duration: 0.6 });
        if (map.getZoom() < 15) {
          map.setZoom(16, { animate: true });
        }
      },
      (err) => {
        console.warn('Live navigation GPS error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  }, [isLiveNavigating, destination, routeDetails, handleStopLiveNav]);

  // Route calculation & polyline drawing
  useEffect(() => {
    if (!routeLayerRef.current) return;

    if (!origin || !destination) {
      lastCalcRouteKeyRef.current = '';
      handleStopLiveNav();
      routeLayerRef.current.clearLayers();
      calculatedAlternativesRef.current = [];
      onRouteCalculated(null);
      onRouteError(null);
      onRouteLoadingChange(false);
      return;
    }

    const routeParamsKey = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}->${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}@${travelMode}`;
    if (lastCalcRouteKeyRef.current === routeParamsKey && calculatedAlternativesRef.current.length > 0) {
      // Exactly same route points, avoid re-fetching or interrupting active navigation!
      return;
    }
    lastCalcRouteKeyRef.current = routeParamsKey;

    let isMounted = true;
    onRouteLoadingChange(true);
    onRouteError(null);

    const calcRoute = async () => {
      try {
        const osrmMode =
          travelMode === 'WALKING'
            ? 'foot'
            : travelMode === 'BICYCLING'
            ? 'bicycle'
            : 'driving';
        // Request OSRM with alternatives=3, overview=full and turn steps
        const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=3`;

        let parsedAlternatives: RouteAlternative[] = [];

        try {
          const res = await fetch(osrmUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              parsedAlternatives = data.routes.map((r: any, idx: number) => {
                const rCoords: [number, number][] = r.geometry.coordinates.map(
                  (c: [number, number]) => [c[1], c[0]]
                );
                const rSteps =
                  r.legs && r.legs[0]?.steps
                    ? parseOsrmSteps(r.legs[0].steps, originLabel, destinationLabel)
                    : [];
                let rHighways =
                  r.legs && r.legs[0]?.steps
                    ? extractHighwaysFromSteps(r.legs[0].steps)
                    : [];
                if (rHighways.length === 0) {
                  rHighways = inferOfflineHighways(origin, destination).highways;
                }
                const rSummary = buildHighwaySummary(rHighways);
                const rDist = r.distance;
                const rDur = r.duration;

                return {
                  id: `route-osrm-${idx}`,
                  title:
                    idx === 0
                      ? `Mais Rápido (${rHighways[0] || 'Principal'})`
                      : `Alternativa ${idx + 1} (${rHighways[0] || 'Secundária'})`,
                  summary: rSummary,
                  highways: rHighways,
                  distanceMeters: rDist,
                  durationMillis: rDur * 1000,
                  distanceText: formatDistance(rDist),
                  durationText: formatDuration(rDur),
                  coordinates: rCoords,
                  steps: rSteps,
                };
              });
            }
          }
        } catch {
          // OSRM failed or offline; handled below
        }

        // Offline or remote area fallback
        if (parsedAlternatives.length === 0) {
          const baseDistance = haversineDistance(origin, destination);
          const speeds: Record<TravelMode, number> = {
            WALKING: 1.25, // ~4.5 km/h
            BICYCLING: 4.2, // ~15 km/h
            DRIVING: 16.7, // ~60 km/h
            TRANSIT: 12.5, // ~45 km/h
          };
          const baseDuration = baseDistance / (speeds[travelMode] || 16.7);

          parsedAlternatives = generateOfflineAlternatives(
            origin,
            originLabel,
            destination,
            destinationLabel,
            travelMode,
            baseDistance,
            baseDuration
          );
        }

        if (!isMounted) return;

        calculatedAlternativesRef.current = parsedAlternatives;

        // Retain selected index if valid, else default to 0
        const activeIdx =
          selectedAltIndexRef.current < parsedAlternatives.length
            ? selectedAltIndexRef.current
            : 0;

        handleSelectAlternativeRef.current(activeIdx);
        onRouteLoadingChange(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Falha ao traçar rota';
        onRouteError(msg);
        onRouteLoadingChange(false);
      }
    };

    calcRoute();

    return () => {
      isMounted = false;
    };
  }, [
    origin,
    destination,
    travelMode,
    originLabel,
    destinationLabel,
    onRouteCalculated,
    onRouteError,
    onRouteLoadingChange,
  ]);

  // Request GPS
  const handleGpsCenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.setView([pt.lat, pt.lng], 15);

          if (userGpsMarkerRef.current) {
            map.removeLayer(userGpsMarkerRef.current);
          }

          const marker = L.circleMarker([pt.lat, pt.lng], {
            radius: 9,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map);

          userGpsMarkerRef.current = marker;
        },
        () => {
          // GPS denied or failed
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Fit bounds specifically to the calculated route
  const handleFitRouteBounds = useCallback(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    const layers = routeLayerRef.current.getLayers();
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [60, 60] });
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Active Route Floating Card with complete offline & turn-by-turn guidance */}
      <ActiveRouteOverlay
        routeDetails={routeDetails}
        origin={origin}
        originLabel={originLabel}
        destination={destination}
        destinationLabel={destinationLabel}
        travelMode={travelMode}
        isLiveNavigating={isLiveNavigating}
        liveNavState={liveNavState}
        onClearRoute={() => {
          handleStopLiveNav();
          onClearRoute();
        }}
        onFitRouteBounds={handleFitRouteBounds}
        onToggleLiveNavigation={handleToggleLiveNavigation}
        onRecenterOnUser={handleRecenterOnUser}
        onSelectAlternative={handleSelectAlternative}
      />

      {/* Picking on Map notification banner */}
      {isPickingOnMap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-600/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl backdrop-blur-xs flex items-center gap-2 border border-blue-400/50 animate-bounce">
          <MapPin className="w-4 h-4 text-cyan-200" />
          <span>Toque no mapa para definir o ponto de partida</span>
        </div>
      )}

      {/* Floating Map Controls on Top Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleFitBounds}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center shadow-lg border border-slate-700/80 transition-all cursor-pointer backdrop-blur-xs"
          title="Enquadrar todos os locais do mapa"
        >
          <Maximize2 className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={handleGpsCenter}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 flex items-center justify-center shadow-lg border border-slate-700/80 transition-all cursor-pointer backdrop-blur-xs"
          title="Minha localização GPS"
        >
          <Navigation className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => {
            setMapType((prev) =>
              prev === 'streets' ? 'satellite' : prev === 'satellite' ? 'topo' : 'streets'
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center shadow-lg border border-slate-700/80 transition-all cursor-pointer backdrop-blur-xs"
          title={`Alternar camadas (${mapType === 'streets' ? 'Satélite' : mapType === 'satellite' ? 'Relevo' : 'Ruas'})`}
        >
          <Layers className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={onOpenPrintModal}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 flex items-center justify-center shadow-lg border border-slate-700/80 transition-all cursor-pointer backdrop-blur-xs"
          title="Imprimir mapa / Exportar PDF"
        >
          <Printer className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={onOpenOfflineModal}
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 flex items-center justify-center shadow-lg border border-slate-700/80 transition-all cursor-pointer backdrop-blur-xs"
          title="Modo Offline & Cache do Mapa"
        >
          <HardDrive className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Selected Placemark Overlay Panel / Info Window */}
      {selectedPlacemark && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-30 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 text-white backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1"
                style={{
                  backgroundColor: `${selectedPlacemark.categoryColor || '#3b82f6'}25`,
                  color: selectedPlacemark.categoryColor || '#60a5fa',
                  border: `1px solid ${selectedPlacemark.categoryColor || '#3b82f6'}50`,
                }}
              >
                {selectedPlacemark.category}
              </span>
              <h2 className="text-base font-bold text-white truncate" title={selectedPlacemark.name}>
                {selectedPlacemark.name}
              </h2>
            </div>
            <button
              onClick={onCloseInfoWindow}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedPlacemark.point && (
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {selectedPlacemark.point.lat.toFixed(6)}, {selectedPlacemark.point.lng.toFixed(6)}
              </span>
            </div>
          )}

          {selectedPlacemark.description && (
            <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
              {selectedPlacemark.description.replace(/<[^>]*>/g, '').trim()}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onSetAsOrigin(selectedPlacemark)}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Partir daqui</span>
            </button>

            <button
              onClick={() => onSetAsDestination(selectedPlacemark)}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Ir até aqui</span>
            </button>

            {selectedPlacemark.point && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlacemark.point.lat},${selectedPlacemark.point.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                title="Abrir no Google Maps externo"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <a
              href={createWhatsAppUrl(selectedPlacemark)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-400 hover:text-emerald-300 transition-colors"
              title="Compartilhar no WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
