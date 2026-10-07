import { CategoryFilter } from './CategoryFilter';
import { PlacemarkList } from './PlacemarkList';
import { RoutePanel } from './RoutePanel';
import { KmzUploader } from './KmzUploader';
import { PWAInstallButton } from './PWAInstallButton';
import { SatelliteTrackerPanel } from './SatelliteTrackerPanel';
import { KmlDocument, PlacemarkFeature, LatLng, TravelMode, RouteResultDetails } from '../types/kml';
import { TrackedSatelliteDevice, DeviceType } from '../types/tracker';
import {
  MapPin,
  Navigation,
  Upload,
  Layers,
  ChevronLeft,
  Satellite,
  Crosshair,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  kmlDoc: KmlDocument;
  selectedCategories: Set<string>;
  searchQuery: string;
  filteredPlacemarks: PlacemarkFeature[];
  selectedPlacemark: PlacemarkFeature | null;
  activeTab: 'tracker' | 'places' | 'routes' | 'upload';
  origin: LatLng | null;
  originLabel: string;
  originType: 'gps' | 'map_click' | 'placemark' | null;
  destination: LatLng | null;
  destinationLabel: string;
  travelMode: TravelMode;
  routeDetails: RouteResultDetails | null;
  routeLoading: boolean;
  routeError: string | null;
  isPickingOnMap: boolean;
  isLoadingFile: boolean;
  isOpen: boolean;

  // Tracker Props
  userLocation: LatLng | null;
  userHeading: number | null;
  activeTrackedDevice: TrackedSatelliteDevice | null;
  allTrackedDevices: TrackedSatelliteDevice[];
  isTransmitting: boolean;
  myDeviceId: string;
  onSelectTrackedDevice: (device: TrackedSatelliteDevice | null) => void;
  onTrackNewId: (id: string, name?: string, type?: DeviceType) => void;
  onToggleTransmission: () => void;
  onUpdateMyDeviceInfo: (info: { deviceId: string; deviceName: string; deviceType: DeviceType; color: string }) => void;
  onNavigateToDevice: (device: TrackedSatelliteDevice) => void;
  onFocusDeviceOnMap: (device: TrackedSatelliteDevice) => void;
  onSimulateDevice: () => void;
  onRemoveTrackedDevice: (id: string) => void;

  // Generic Props
  onTabChange: (tab: 'tracker' | 'places' | 'routes' | 'upload') => void;
  onCloseSidebar?: () => void;
  onToggleCategory: (catName: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  onSearchChange: (q: string) => void;
  onSelectPlacemark: (pm: PlacemarkFeature) => void;
  onSetAsOrigin: (pm: PlacemarkFeature) => void;
  onSetAsDestination: (pm: PlacemarkFeature) => void;
  onSetTravelMode: (mode: TravelMode) => void;
  onRequestGpsLocation: () => void;
  onTogglePickOnMap: () => void;
  onSwapPoints: () => void;
  onClearRoute: () => void;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleId: string) => void;
  onOpenPrintModal: () => void;
  onOpenJsonModal: () => void;
  onOpenOfflineModal?: () => void;
  onViewOnMap?: () => void;
  onSelectAlternative?: (index: number) => void;
  uploadError?: string | null;
  onClearUploadError?: () => void;
}

export function Sidebar({
  kmlDoc,
  selectedCategories,
  searchQuery,
  filteredPlacemarks,
  selectedPlacemark,
  activeTab,
  origin,
  originLabel,
  originType,
  destination,
  destinationLabel,
  travelMode,
  routeDetails,
  routeLoading,
  routeError,
  isPickingOnMap,
  isLoadingFile,
  isOpen,

  // Tracker
  userLocation,
  userHeading,
  activeTrackedDevice,
  allTrackedDevices,
  isTransmitting,
  myDeviceId,
  onSelectTrackedDevice,
  onTrackNewId,
  onToggleTransmission,
  onUpdateMyDeviceInfo,
  onNavigateToDevice,
  onFocusDeviceOnMap,
  onSimulateDevice,
  onRemoveTrackedDevice,

  // Navigation & Places
  onTabChange,
  onCloseSidebar,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  onSearchChange,
  onSelectPlacemark,
  onSetAsOrigin,
  onSetAsDestination,
  onSetTravelMode,
  onRequestGpsLocation,
  onTogglePickOnMap,
  onSwapPoints,
  onClearRoute,
  onFileUpload,
  onLoadSample,
  onOpenPrintModal,
  onOpenJsonModal,
  onOpenOfflineModal,
  onViewOnMap,
  onSelectAlternative,
  uploadError,
  onClearUploadError,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseSidebar}
          className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-xs z-20 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-14 left-0 w-full sm:w-[400px] md:w-[420px] bg-slate-900 border-r border-slate-800 shadow-2xl md:shadow-none z-20 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header bar */}
        <div className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-slate-950 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              {activeTab === 'tracker' && '📡 Rastreador & Satélite'}
              {activeTab === 'routes' && '🧭 Traçar Rotas'}
              {activeTab === 'places' && '📍 Camadas & Locais'}
              {activeTab === 'upload' && '📁 Importar Arquivo KMZ'}
            </span>
          </div>

          <button
            onClick={onCloseSidebar}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 active:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold cursor-pointer border border-slate-700"
            aria-label="Ver Mapa"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span>Ver Mapa</span>
          </button>
        </div>

        {/* Mobile Install App banner */}
        <div className="px-2.5 py-2 bg-slate-950 border-b border-slate-800 md:hidden">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-2 sm:px-3 pt-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {/* TRACKER TAB (Primary) */}
          <button
            onClick={() => onTabChange('tracker')}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold border-b-2 transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'tracker'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Satellite className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Rastreador</span>
            {isTransmitting && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            )}
          </button>

          {/* ROUTES TAB */}
          <button
            onClick={() => onTabChange('routes')}
            className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'routes'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 rotate-45 shrink-0" />
            <span className="truncate">Rotas</span>
            {routeDetails && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </button>

          {/* PLACES TAB (if placemarks exist) */}
          {filteredPlacemarks.length > 0 && (
            <button
              onClick={() => onTabChange('places')}
              className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'places'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Locais</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                {filteredPlacemarks.length}
              </span>
            </button>
          )}

          {/* UPLOAD KMZ TAB */}
          <button
            onClick={() => onTabChange('upload')}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400 bg-blue-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">KMZ</span>
          </button>
        </div>

        {/* Tab Panels */}
        <div className="flex-1 overflow-y-auto bg-slate-900 pb-20 md:pb-2">
          {/* TRACKER TAB */}
          {activeTab === 'tracker' && (
            <SatelliteTrackerPanel
              userLocation={userLocation}
              userHeading={userHeading}
              activeTrackedDevice={activeTrackedDevice}
              allTrackedDevices={allTrackedDevices}
              isTransmitting={isTransmitting}
              myDeviceId={myDeviceId}
              onSelectTrackedDevice={onSelectTrackedDevice}
              onTrackNewId={onTrackNewId}
              onToggleTransmission={onToggleTransmission}
              onUpdateMyDeviceInfo={onUpdateMyDeviceInfo}
              onNavigateToDevice={onNavigateToDevice}
              onFocusDeviceOnMap={onFocusDeviceOnMap}
              onRequestGps={onRequestGpsLocation}
              onSimulateDevice={onSimulateDevice}
              onRemoveTrackedDevice={onRemoveTrackedDevice}
            />
          )}

          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="p-3">
              <RoutePanel
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
                placemarks={filteredPlacemarks}
                onSetTravelMode={onSetTravelMode}
                onRequestGpsLocation={onRequestGpsLocation}
                onTogglePickOnMap={onTogglePickOnMap}
                onSelectPlacemarkAsOrigin={onSetAsOrigin}
                onSelectPlacemarkAsDestination={onSetAsDestination}
                onSwapPoints={onSwapPoints}
                onClearRoute={onClearRoute}
                onViewOnMap={onViewOnMap}
                onSelectAlternative={onSelectAlternative}
              />
            </div>
          )}

          {/* PLACES TAB */}
          {activeTab === 'places' && (
            <div className="p-3 space-y-3">
              <CategoryFilter
                categories={kmlDoc.categories}
                selectedCategories={selectedCategories}
                searchQuery={searchQuery}
                totalPlacemarks={kmlDoc.placemarks.length}
                filteredCount={filteredPlacemarks.length}
                onToggleCategory={onToggleCategory}
                onSelectAllCategories={onSelectAllCategories}
                onDeselectAllCategories={onDeselectAllCategories}
                onSearchChange={onSearchChange}
              />

              <PlacemarkList
                placemarks={filteredPlacemarks}
                selectedPlacemark={selectedPlacemark}
                onSelectPlacemark={onSelectPlacemark}
                onSetAsOrigin={onSetAsOrigin}
                onSetAsDestination={onSetAsDestination}
              />
            </div>
          )}

          {/* UPLOAD KMZ TAB */}
          {activeTab === 'upload' && (
            <div className="p-3">
              <KmzUploader
                currentFileName={kmlDoc.fileName}
                placemarkCount={kmlDoc.placemarks.length}
                isLoading={isLoadingFile}
                uploadError={uploadError}
                onFileUpload={onFileUpload}
                onLoadSample={onLoadSample}
                onClearError={onClearUploadError}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
