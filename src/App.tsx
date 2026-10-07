import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, X, MapPin, Route, Compass, Upload, Printer, Satellite, Crosshair } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PrintModal } from './components/PrintModal';
import { JsonExportModal } from './components/JsonExportModal';
import { MobileGuideModal } from './components/MobileGuideModal';
import { OfflineMapModal } from './components/OfflineMapModal';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { LeafletMapView } from './components/LeafletMapView';
import { SatelliteRadarWidget } from './components/SatelliteRadarWidget';
import { getEmptyDataset } from './data/sampleKmz';
import { parseKmzOrKml } from './utils/kmzParser';
import {
  KmlDocument,
  PlacemarkFeature,
  LatLng,
  TravelMode,
  RouteResultDetails,
} from './types/kml';
import {
  TrackedSatelliteDevice,
  DeviceType,
} from './types/tracker';
import {
  getSavedMyDeviceInfo,
  saveMyDeviceInfo,
  getSavedTargetDeviceIds,
  saveTargetDeviceId,
  removeSavedTargetDeviceId,
  normalizeDeviceId,
  sendDeviceTelemetry,
  fetchDeviceTelemetry,
  fetchActiveDevicesList,
  DEVICE_COLORS,
} from './utils/trackerService';

export default function App() {
  // Empty default document - clean start with no sample or Pio IX data
  const [kmlDoc, setKmlDoc] = useState<KmlDocument>(() => getEmptyDataset());

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & UI state
  const [selectedPlacemark, setSelectedPlacemark] = useState<PlacemarkFeature | null>(null);
  const [activeTab, setActiveTab] = useState<'tracker' | 'places' | 'routes' | 'upload'>('tracker');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);

  // User GPS & Heading State
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);

  // Routing state
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState('Ponto de Partida');
  const [originType, setOriginType] = useState<'gps' | 'map_click' | 'placemark' | null>(null);

  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('Destino');

  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [routeDetails, setRouteDetails] = useState<RouteResultDetails | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);

  // ------------------------------------------------------------------------
  // SATELLITE TRACKER STATE
  // ------------------------------------------------------------------------
  const [myInfo, setMyInfo] = useState(() => getSavedMyDeviceInfo());
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [trackedDevices, setTrackedDevices] = useState<TrackedSatelliteDevice[]>([]);
  const [activeTrackedDevice, setActiveTrackedDevice] = useState<TrackedSatelliteDevice | null>(null);

  const transmitterWatchIdRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);

  // Initialize and check for ?track=ID parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get('track');
    const savedIds = getSavedTargetDeviceIds();

    if (trackParam) {
      const cleanId = normalizeDeviceId(trackParam);
      saveTargetDeviceId(cleanId);
      // Fetch or create stub for this device
      fetchDeviceTelemetry(cleanId).then((dev) => {
        if (dev) {
          setTrackedDevices((prev) => {
            const filtered = prev.filter((d) => d.id !== cleanId);
            return [dev, ...filtered];
          });
          setActiveTrackedDevice(dev);
        } else {
          // Placeholder device waiting for signal
          const stub: TrackedSatelliteDevice = {
            id: cleanId,
            name: `Aparelho ${cleanId}`,
            type: 'smartphone',
            lat: -14.235,
            lng: -51.9253,
            altitude: null,
            speedKmh: null,
            heading: null,
            accuracy: null,
            battery: null,
            satellites: 12,
            constellation: 'GNSS Multi-Banda',
            signalQuality: 'desconectado',
            status: 'standby',
            lastSeen: Date.now(),
            color: DEVICE_COLORS[0],
            history: [],
          };
          setTrackedDevices((prev) => [stub, ...prev]);
          setActiveTrackedDevice(stub);
        }
      });
    } else if (savedIds.length > 0) {
      // Load saved devices
      Promise.all(savedIds.map((id) => fetchDeviceTelemetry(id))).then((results) => {
        const found = results.filter((d): d is TrackedSatelliteDevice => d !== null);
        if (found.length > 0) {
          setTrackedDevices(found);
          setActiveTrackedDevice(found[0]);
        }
      });
    }
  }, []);

  // Poll active devices and update active tracked device
  useEffect(() => {
    if (!activeTrackedDevice) return;

    // 1. Try Server-Sent Events (SSE) for instant push
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`/api/tracker/stream/${encodeURIComponent(activeTrackedDevice.id)}`);
      sse.onmessage = (event) => {
        try {
          const updated: TrackedSatelliteDevice = JSON.parse(event.data);
          setActiveTrackedDevice(updated);
          setTrackedDevices((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        } catch (err) {
          console.warn('Error parsing SSE telemetry', err);
        }
      };
    } catch {
      // Fallback to polling
    }

    // 2. Interval polling fallback
    const interval = setInterval(() => {
      fetchDeviceTelemetry(activeTrackedDevice.id).then((updated) => {
        if (updated) {
          setActiveTrackedDevice(updated);
          setTrackedDevices((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }
      });
    }, 4000);

    return () => {
      if (sse) sse.close();
      clearInterval(interval);
    };
  }, [activeTrackedDevice?.id]);

  // Transmit current device's GPS signal via satellite endpoint
  useEffect(() => {
    if (!isTransmitting) {
      if (transmitterWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(transmitterWatchIdRef.current);
        transmitterWatchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setIsTransmitting(false);
      setRouteError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    // Watch position and broadcast
    transmitterWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(pt);
        if (pos.coords.heading !== null) {
          setUserHeading(pos.coords.heading);
        }

        sendDeviceTelemetry({
          id: myInfo.deviceId,
          name: myInfo.deviceName,
          type: myInfo.deviceType,
          lat: pt.lat,
          lng: pt.lng,
          altitude: pos.coords.altitude,
          speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          battery: 90,
          satellites: 14,
          constellation: 'GNSS Multi-Banda (GPS/Galileo)',
          signalQuality: 'excelente',
          color: myInfo.color,
        });
      },
      (err) => {
        console.warn('Geolocation transmitter error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (transmitterWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(transmitterWatchIdRef.current);
        transmitterWatchIdRef.current = null;
      }
    };
  }, [isTransmitting, myInfo]);

  // Handle Simulation Mode for testing satellite telemetry
  const handleSimulateDevice = useCallback(() => {
    const center = userLocation || origin || { lat: -23.55052, lng: -46.633308 }; // São Paulo default or user GPS
    const demoId = `TEST-${Math.floor(100 + Math.random() * 900)}`;

    const demoDevice: TrackedSatelliteDevice = {
      id: demoId,
      name: `Rastreador Teste ${demoId}`,
      type: 'vehicle',
      lat: center.lat + 0.004,
      lng: center.lng + 0.005,
      altitude: 760,
      speedKmh: 42,
      heading: 45,
      accuracy: 2.5,
      battery: 88,
      satellites: 16,
      constellation: 'GNSS Multi-Banda (GPS/Galileo)',
      signalQuality: 'excelente',
      status: 'online',
      lastSeen: Date.now(),
      color: DEVICE_COLORS[Math.floor(Math.random() * DEVICE_COLORS.length)],
      isSimulated: true,
      history: [
        { lat: center.lat + 0.002, lng: center.lng + 0.002, timestamp: Date.now() - 10000 },
        { lat: center.lat + 0.003, lng: center.lng + 0.0035, timestamp: Date.now() - 5000 },
        { lat: center.lat + 0.004, lng: center.lng + 0.005, timestamp: Date.now() },
      ],
    };

    saveTargetDeviceId(demoId);
    setTrackedDevices((prev) => [demoDevice, ...prev.filter((d) => d.id !== demoId)]);
    setActiveTrackedDevice(demoDevice);

    // Also send to backend
    sendDeviceTelemetry(demoDevice);

    // Clear previous simulation loop
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
    }

    // Step simulation every 3 seconds
    let step = 0;
    simulationIntervalRef.current = window.setInterval(() => {
      step += 1;
      const angle = (step * 25 * Math.PI) / 180;
      const newLat = center.lat + 0.004 + Math.sin(angle) * 0.003;
      const newLng = center.lng + 0.005 + Math.cos(angle) * 0.003;
      const newHeading = Math.round((angle * 180) / Math.PI) % 360;
      const newSpeed = 35 + Math.round(Math.sin(step) * 15);

      const updated: TrackedSatelliteDevice = {
        ...demoDevice,
        lat: newLat,
        lng: newLng,
        heading: newHeading,
        speedKmh: newSpeed,
        lastSeen: Date.now(),
        history: [
          ...(demoDevice.history || []),
          { lat: newLat, lng: newLng, speedKmh: newSpeed, timestamp: Date.now() },
        ].slice(-40),
      };

      setTrackedDevices((prev) =>
        prev.map((d) => (d.id === demoId ? updated : d))
      );
      setActiveTrackedDevice((current) => (current?.id === demoId ? updated : current));
      sendDeviceTelemetry(updated);
    }, 3000);
  }, [userLocation, origin]);

  // Clean up simulation loop on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current !== null) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  // Track a new Device ID
  const handleTrackNewId = useCallback((id: string, name?: string, type?: DeviceType) => {
    const cleanId = normalizeDeviceId(id);
    saveTargetDeviceId(cleanId);

    fetchDeviceTelemetry(cleanId).then((found) => {
      if (found) {
        setTrackedDevices((prev) => [found, ...prev.filter((d) => d.id !== cleanId)]);
        setActiveTrackedDevice(found);
      } else {
        const newDevice: TrackedSatelliteDevice = {
          id: cleanId,
          name: name || `Aparelho ${cleanId}`,
          type: type || 'smartphone',
          lat: userLocation ? userLocation.lat + 0.003 : -14.235,
          lng: userLocation ? userLocation.lng + 0.003 : -51.9253,
          altitude: null,
          speedKmh: null,
          heading: null,
          accuracy: null,
          battery: 90,
          satellites: 12,
          constellation: 'GNSS Multi-Banda',
          signalQuality: 'excelente',
          status: 'online',
          lastSeen: Date.now(),
          color: DEVICE_COLORS[Math.floor(Math.random() * DEVICE_COLORS.length)],
          history: [],
        };
        setTrackedDevices((prev) => [newDevice, ...prev.filter((d) => d.id !== cleanId)]);
        setActiveTrackedDevice(newDevice);
        sendDeviceTelemetry(newDevice);
      }
    });
  }, [userLocation]);

  const handleRemoveTrackedDevice = useCallback((id: string) => {
    removeSavedTargetDeviceId(id);
    setTrackedDevices((prev) => prev.filter((d) => d.id !== id));
    setActiveTrackedDevice((curr) => (curr?.id === id ? null : curr));
  }, []);

  // Set tracked device as destination and calculate route from user location
  const handleNavigateToDevice = useCallback((device: TrackedSatelliteDevice) => {
    const destPt = { lat: device.lat, lng: device.lng };
    setDestination(destPt);
    setDestinationLabel(`${device.name} (${device.id})`);

    // If user has GPS, set as origin directly; otherwise request GPS
    if (userLocation) {
      setOrigin(userLocation);
      setOriginLabel('Minha Localização (GPS)');
      setOriginType('gps');
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(pt);
          setOrigin(pt);
          setOriginLabel('Minha Localização (GPS)');
          setOriginType('gps');
        },
        () => {
          // Fallback: pick departure point or open routes tab
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    setActiveTab('routes');
    setSidebarOpen(false); // allow full map navigation view
  }, [userLocation]);

  const handleFocusDeviceOnMap = useCallback((device: TrackedSatelliteDevice) => {
    setActiveTrackedDevice(device);
    setSidebarOpen(false);
  }, []);

  // Filtered placemarks calculation (for KML/KMZ files if loaded)
  const filteredPlacemarks = useMemo(() => {
    return kmlDoc.placemarks.filter((pm) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(pm.category)) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inName = pm.name.toLowerCase().includes(query);
        const inDesc = pm.description.toLowerCase().includes(query);
        const inCat = pm.category.toLowerCase().includes(query);
        return inName || inDesc || inCat;
      }
      return true;
    });
  }, [kmlDoc.placemarks, selectedCategories, searchQuery]);

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(kmlDoc.categories.map((c) => c.name)));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const handleSelectPlacemark = useCallback((pm: PlacemarkFeature) => {
    setSelectedPlacemark(pm);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleCloseInfoWindow = useCallback(() => {
    setSelectedPlacemark(null);
  }, []);

  const handleSetAsDestination = useCallback((pm: PlacemarkFeature) => {
    if (!pm.point) return;
    setDestination(pm.point);
    setDestinationLabel(pm.name);
    setActiveTab('routes');
    setSidebarOpen(true);
  }, []);

  const handleSetAsOrigin = useCallback((pm: PlacemarkFeature) => {
    if (!pm.point) return;
    setOrigin(pm.point);
    setOriginLabel(pm.name);
    setOriginType('placemark');
    setIsPickingOnMap(false);
    setActiveTab('routes');
    setSidebarOpen(true);
  }, []);

  // Geolocation request
  const handleRequestGpsLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setRouteError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(pt);
        if (pos.coords.heading !== null) {
          setUserHeading(pos.coords.heading);
        }
        setOrigin(pt);
        setOriginLabel('Minha Localização (GPS)');
        setOriginType('gps');
        setIsPickingOnMap(false);
        setRouteLoading(false);
      },
      (err) => {
        setRouteLoading(false);
        console.warn('Geolocation error:', err);
        setRouteError('Não foi possível obter sua localização GPS. Verifique a permissão do navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleTogglePickOnMap = useCallback(() => {
    setIsPickingOnMap((prev) => !prev);
  }, []);

  const handleMapClickPoint = useCallback((pt: LatLng) => {
    setOrigin(pt);
    setOriginLabel(`Ponto marcado (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`);
    setOriginType('map_click');
    setIsPickingOnMap(false);
    setActiveTab('routes');
  }, []);

  const handleDragDeparture = useCallback((pt: LatLng) => {
    setOrigin(pt);
    setOriginLabel(`Ponto de partida (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`);
  }, []);

  const handleSwapPoints = useCallback(() => {
    setOrigin((prevOrigin) => {
      setDestination(prevOrigin);
      return destination;
    });
    setOriginLabel((prevOriginLabel) => {
      setDestinationLabel(prevOriginLabel);
      return destinationLabel;
    });
    setOriginType(destination ? 'placemark' : null);
  }, [destination, destinationLabel]);

  const handleClearRoute = useCallback(() => {
    setOrigin(null);
    setOriginLabel('Ponto de Partida');
    setOriginType(null);
    setDestination(null);
    setDestinationLabel('Destino');
    setRouteDetails(null);
    setRouteError(null);
    setIsPickingOnMap(false);
  }, []);

  const handleViewOnMap = useCallback(() => {
    setSidebarOpen(false);
    setActiveTab('routes');
  }, []);

  const handleOpenRouteTab = useCallback(() => {
    setActiveTab('routes');
    setSidebarOpen(true);
  }, []);

  const handleOpenTrackerTab = useCallback(() => {
    setActiveTab('tracker');
    setSidebarOpen(true);
  }, []);

  const handleSelectAlternative = useCallback((idx: number) => {
    setRouteDetails((prev) => {
      if (!prev || !prev.alternatives || !prev.alternatives[idx]) return prev;
      const alt = prev.alternatives[idx];
      return {
        ...prev,
        distanceMeters: alt.distanceMeters,
        durationMillis: alt.durationMillis,
        distanceText: alt.distanceText,
        durationText: alt.durationText,
        summary: alt.summary,
        highways: alt.highways,
        steps: alt.steps,
        selectedAlternativeIndex: idx,
      };
    });
  }, []);

  const handleLoadSample = (_sampleId?: string) => {
    const doc = getEmptyDataset();
    setKmlDoc(doc);
    setSelectedCategories(new Set());
    setSelectedPlacemark(null);
    handleClearRoute();
    setActiveTab('tracker');
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoadingFile(true);
      setFileUploadError(null);
      const parsedDoc = await parseKmzOrKml(file);
      setKmlDoc(parsedDoc);
      setSelectedCategories(new Set(parsedDoc.categories.map((c) => c.name)));
      setSelectedPlacemark(null);
      handleClearRoute();
      setActiveTab('places');
      setIsLoadingFile(false);
    } catch (err: any) {
      setIsLoadingFile(false);
      const msg =
        err?.message ||
        'Não foi possível interpretar o arquivo. Verifique se é um arquivo KMZ ou KML válido.';
      setFileUploadError(msg);
      setActiveTab('upload');
      setSidebarOpen(true);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Header */}
      <Header
        fileName={kmlDoc.title || kmlDoc.fileName}
        totalPlacemarks={kmlDoc.placemarks.length}
        filteredCount={filteredPlacemarks.length}
        hasActiveRoute={Boolean(routeDetails)}
        sidebarOpen={sidebarOpen}
        isTransmitting={isTransmitting}
        trackedDevicesCount={trackedDevices.length}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenUploadTab={() => {
          setActiveTab('upload');
          setSidebarOpen(true);
        }}
        onRequestGps={handleRequestGpsLocation}
        onOpenRouteTab={handleOpenRouteTab}
        onOpenTrackerTab={handleOpenTrackerTab}
        onToggleTransmission={() => setIsTransmitting((prev) => !prev)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
        onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
      />

      {/* Main Workspace: Sidebar + Map */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar Panel */}
        <Sidebar
          kmlDoc={kmlDoc}
          selectedCategories={selectedCategories}
          searchQuery={searchQuery}
          filteredPlacemarks={filteredPlacemarks}
          selectedPlacemark={selectedPlacemark}
          activeTab={activeTab}
          origin={origin}
          originLabel={originLabel}
          originType={originType}
          destination={destination}
          destinationLabel={destinationLabel}
          travelMode={travelMode}
          routeDetails={routeDetails}
          routeLoading={routeLoading}
          routeError={routeError}
          isPickingOnMap={isPickingOnMap}
          isLoadingFile={isLoadingFile}
          isOpen={sidebarOpen}
          // Tracker
          userLocation={userLocation}
          userHeading={userHeading}
          activeTrackedDevice={activeTrackedDevice}
          allTrackedDevices={trackedDevices}
          isTransmitting={isTransmitting}
          myDeviceId={myInfo.deviceId}
          onSelectTrackedDevice={setActiveTrackedDevice}
          onTrackNewId={handleTrackNewId}
          onToggleTransmission={() => setIsTransmitting((prev) => !prev)}
          onUpdateMyDeviceInfo={(info) => {
            setMyInfo(info);
            saveMyDeviceInfo(info);
          }}
          onNavigateToDevice={handleNavigateToDevice}
          onFocusDeviceOnMap={handleFocusDeviceOnMap}
          onSimulateDevice={handleSimulateDevice}
          onRemoveTrackedDevice={handleRemoveTrackedDevice}
          // Nav & Places
          onTabChange={setActiveTab}
          onToggleCategory={handleToggleCategory}
          onSelectAllCategories={handleSelectAllCategories}
          onDeselectAllCategories={handleDeselectAllCategories}
          onSearchChange={setSearchQuery}
          onSelectPlacemark={handleSelectPlacemark}
          onSetAsOrigin={handleSetAsOrigin}
          onSetAsDestination={handleSetAsDestination}
          onSetTravelMode={setTravelMode}
          onRequestGpsLocation={handleRequestGpsLocation}
          onTogglePickOnMap={handleTogglePickOnMap}
          onSwapPoints={handleSwapPoints}
          onClearRoute={handleClearRoute}
          onFileUpload={handleFileUpload}
          onLoadSample={handleLoadSample}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onOpenJsonModal={() => setIsJsonModalOpen(true)}
          onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
          onViewOnMap={handleViewOnMap}
          onSelectAlternative={handleSelectAlternative}
          uploadError={fileUploadError}
          onClearUploadError={() => setFileUploadError(null)}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        {/* Map Container */}
        <main className="flex-1 relative h-full w-full bg-slate-900 pb-14 md:pb-0">
          {/* Offline Status Alert Banner */}
          <OfflineStatusBanner onOpenOfflineModal={() => setIsOfflineModalOpen(true)} />

          {/* Floating Proximity Radar Widget for Active Tracked Device */}
          {activeTrackedDevice && (
            <SatelliteRadarWidget
              device={activeTrackedDevice}
              userLocation={userLocation}
              userHeading={userHeading}
              onNavigateToDevice={() => handleNavigateToDevice(activeTrackedDevice)}
              onFocusDevice={() => handleFocusDeviceOnMap(activeTrackedDevice)}
              onClose={() => setActiveTrackedDevice(null)}
            />
          )}

          {fileUploadError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%] bg-rose-900/95 text-white p-3 rounded-xl shadow-xl border border-rose-700/80 backdrop-blur-md flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold block text-rose-100">Não foi possível carregar o arquivo:</span>
                <span className="text-rose-200">{fileUploadError}</span>
              </div>
              <button
                onClick={() => setFileUploadError(null)}
                className="text-rose-300 hover:text-white p-1 cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <LeafletMapView
            filteredPlacemarks={filteredPlacemarks}
            selectedPlacemark={selectedPlacemark}
            origin={origin}
            originLabel={originLabel}
            destination={destination}
            destinationLabel={destinationLabel}
            travelMode={travelMode}
            routeDetails={routeDetails}
            isPickingOnMap={isPickingOnMap}
            kmlDoc={kmlDoc}
            onSelectPlacemark={handleSelectPlacemark}
            onSetAsOrigin={handleSetAsOrigin}
            onSetAsDestination={handleSetAsDestination}
            onCloseInfoWindow={handleCloseInfoWindow}
            onRouteCalculated={setRouteDetails}
            onRouteError={setRouteError}
            onRouteLoadingChange={setRouteLoading}
            onClearRoute={handleClearRoute}
            onMapClickPoint={handleMapClickPoint}
            onDragDeparture={handleDragDeparture}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
            onSelectAlternative={handleSelectAlternative}
            trackedDevices={trackedDevices}
            activeTrackedDevice={activeTrackedDevice}
            userLocation={userLocation}
            onSelectTrackedDevice={setActiveTrackedDevice}
            onNavigateToDevice={handleNavigateToDevice}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-1 py-1 shadow-2xl safe-area-bottom">
        {/* SATELLITE TRACKER BUTTON */}
        <button
          onClick={() => {
            if (sidebarOpen && activeTab === 'tracker') {
              setSidebarOpen(false);
            } else {
              setActiveTab('tracker');
              setSidebarOpen(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[46px] ${
            sidebarOpen && activeTab === 'tracker'
              ? 'text-cyan-400 bg-cyan-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Rastreador Satélite"
        >
          <div className="relative">
            <Satellite className="w-4.5 h-4.5" />
            {isTransmitting && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Rastreador</span>
        </button>

        {/* ROUTES BUTTON */}
        <button
          onClick={() => {
            if (sidebarOpen && activeTab === 'routes') {
              setSidebarOpen(false);
            } else {
              setActiveTab('routes');
              setSidebarOpen(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[46px] ${
            sidebarOpen && activeTab === 'routes'
              ? 'text-blue-400 bg-blue-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Traçar Rotas"
        >
          <div className="relative">
            <Route className="w-4.5 h-4.5" />
            {routeDetails && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Rotas</span>
        </button>

        {/* VIEW MAP DIRECTLY */}
        <button
          onClick={() => setSidebarOpen(false)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[46px] ${
            !sidebarOpen
              ? 'text-emerald-400 bg-emerald-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Ver Mapa"
        >
          <Compass className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5">Ver Mapa</span>
        </button>

        {/* KMZ FILE BUTTON */}
        <button
          onClick={() => {
            if (sidebarOpen && activeTab === 'upload') {
              setSidebarOpen(false);
            } else {
              setActiveTab('upload');
              setSidebarOpen(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[46px] ${
            sidebarOpen && activeTab === 'upload'
              ? 'text-indigo-400 bg-indigo-950/60 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Arquivo KMZ"
        >
          <Upload className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5">Arquivo</span>
        </button>

        {/* PDF / PRINT BUTTON */}
        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[46px] text-slate-400 hover:text-slate-200"
          aria-label="PDF / Imprimir"
        >
          <Printer className="w-4.5 h-4.5 text-emerald-400" />
          <span className="text-[10px] mt-0.5">PDF</span>
        </button>
      </nav>

      {/* Print PDF Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        documentTitle={kmlDoc.title || kmlDoc.fileName}
        placemarks={filteredPlacemarks}
        origin={origin}
        originLabel={originLabel}
        routeDetails={routeDetails}
      />

      {/* JSON / GeoJSON Converter Modal */}
      <JsonExportModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        kmlDoc={kmlDoc}
        filteredPlacemarks={filteredPlacemarks}
        onLoadFileToMap={handleFileUpload}
      />

      {/* Mobile Google Maps Guide Modal */}
      <MobileGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
      />

      {/* Offline Map Cache Manager Modal */}
      <OfflineMapModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />
    </div>
  );
}
