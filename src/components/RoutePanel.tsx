import { useState } from 'react';
import { LatLng, TravelMode, RouteResultDetails, PlacemarkFeature } from '../types/kml';
import {
  Navigation,
  Car,
  Footprints,
  Bike,
  Bus,
  ArrowUpDown,
  LocateFixed,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Milestone,
} from 'lucide-react';

interface RoutePanelProps {
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
  placemarks: PlacemarkFeature[];
  onSetTravelMode: (mode: TravelMode) => void;
  onRequestGpsLocation: () => void;
  onTogglePickOnMap: () => void;
  onSelectPlacemarkAsOrigin: (pm: PlacemarkFeature) => void;
  onSelectPlacemarkAsDestination: (pm: PlacemarkFeature) => void;
  onSwapPoints: () => void;
  onClearRoute: () => void;
  onViewOnMap?: () => void;
  onSelectAlternative?: (index: number) => void;
}

export function RoutePanel({
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
  placemarks,
  onSetTravelMode,
  onRequestGpsLocation,
  onTogglePickOnMap,
  onSelectPlacemarkAsOrigin,
  onSelectPlacemarkAsDestination,
  onSwapPoints,
  onClearRoute,
  onViewOnMap,
  onSelectAlternative,
}: RoutePanelProps) {
  const [showSteps, setShowSteps] = useState(false);

  const travelModes: Array<{ mode: TravelMode; label: string; icon: any }> = [
    { mode: 'DRIVING', label: 'Carro', icon: Car },
    { mode: 'WALKING', label: 'A pé', icon: Footprints },
    { mode: 'BICYCLING', label: 'Bike', icon: Bike },
    { mode: 'TRANSIT', label: 'Ônibus', icon: Bus },
  ];

  const canNavigateExternal = origin && destination;
  const externalMapsUrl = canNavigateExternal
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${travelMode.toLowerCase()}`
    : '#';

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 fill-current rotate-45" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">Traçar Rotas & Navegação</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500">Navegação integrada e offline</p>
          </div>
        </div>

        {(origin || destination || routeDetails) && (
          <button
            onClick={onClearRoute}
            className="text-xs text-slate-400 hover:text-rose-600 active:text-rose-700 flex items-center gap-1 transition-colors px-2 py-1.5 rounded hover:bg-rose-50 cursor-pointer min-h-[36px]"
            title="Limpar rota atual"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Origin / Departure Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Ponto de Partida (Origem)</span>
          </label>
          {origin && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
            </span>
          )}
        </div>

        {/* Origin Quick Options */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={onRequestGpsLocation}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer min-h-[40px] ${
              originType === 'gps'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Onde estou (GPS)</span>
          </button>

          <button
            onClick={onTogglePickOnMap}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer min-h-[40px] ${
              isPickingOnMap
                ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300 animate-pulse'
                : originType === 'map_click'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{isPickingOnMap ? 'Clique no Mapa...' : 'Marcar no Mapa'}</span>
          </button>
        </div>

        {/* Selected Origin label or select from placemarks */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 mt-1">
          <div className="flex-1 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 truncate min-h-[36px] flex items-center">
            {origin ? (
              <span className="font-medium text-slate-900 truncate">
                {originType === 'gps' && '📍 '}
                {originType === 'map_click' && '📌 '}
                {originType === 'placemark' && '🚩 '}
                {originLabel}
              </span>
            ) : (
              <span className="text-slate-400 italic truncate">
                Defina sua localização ou escolha um ponto
              </span>
            )}
          </div>

          <select
            value={originType === 'placemark' && origin ? placemarks.find(p => p.point?.lat === origin.lat && p.point?.lng === origin.lng)?.id || '' : ''}
            onChange={(e) => {
              const pm = placemarks.find((p) => p.id === e.target.value);
              if (pm) onSelectPlacemarkAsOrigin(pm);
            }}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-[130px] min-h-[36px]"
            title="Escolher um ponto do arquivo como partida"
          >
            <option value="">Locais KMZ...</option>
            {placemarks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center -my-1">
        <button
          onClick={onSwapPoints}
          disabled={!origin || !destination}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-200 shadow-2xs hover:rotate-180 duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Inverter Origem e Destino"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* Destination Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span>Destino Final</span>
          </label>
          {destination && (
            <span className="text-[10px] text-rose-700 bg-rose-50 font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
          <div className="flex-1 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 truncate min-h-[36px] flex items-center">
            {destination ? (
              <span className="font-medium text-slate-900 truncate">🏁 {destinationLabel}</span>
            ) : (
              <span className="text-slate-400 italic truncate">
                Selecione um marcador no mapa ou na lista
              </span>
            )}
          </div>

          <select
            value={destination ? placemarks.find(p => p.point?.lat === destination.lat && p.point?.lng === destination.lng)?.id || '' : ''}
            onChange={(e) => {
              const pm = placemarks.find((p) => p.id === e.target.value);
              if (pm) onSelectPlacemarkAsDestination(pm);
            }}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-[130px] min-h-[36px]"
            title="Escolher destino do arquivo"
          >
            <option value="">Escolher destino...</option>
            {placemarks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Travel Modes */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-500">Meio de transporte:</span>
        <div className="grid grid-cols-4 gap-1.5">
          {travelModes.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => onSetTravelMode(mode)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                travelMode === mode
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 active:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Helper instruction if picking point */}
      {isPickingOnMap && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
          <span>
            <strong>Modo Seleção Ativo:</strong> Toque no mapa para posicionar o ponto de partida.
          </span>
        </div>
      )}

      {/* Loading state */}
      {routeLoading && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-center gap-2 text-xs text-blue-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
          <span>Calculando melhores trajetos e rodovias...</span>
        </div>
      )}

      {/* Error state */}
      {routeError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{routeError}</span>
        </div>
      )}

      {/* Route Calculated Summary */}
      {routeDetails && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rota Calculada com Sucesso</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              {travelMode}
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">Distância Total</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {routeDetails.distanceText}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-500 block">Tempo Estimado</span>
              <span className="text-base sm:text-lg font-bold text-blue-600">
                {routeDetails.durationText}
              </span>
            </div>
          </div>

          {/* Highways Display */}
          {routeDetails.highways && routeDetails.highways.length > 0 && (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">
                  Rodovias a Seguir:
                </span>
                <span className="text-slate-400 font-medium">
                  {routeDetails.summary}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {routeDetails.highways.map((hw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-mono font-bold text-[10px] shadow-2xs"
                  >
                    {hw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives Switcher */}
          {routeDetails.alternatives && routeDetails.alternatives.length > 1 && (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Melhores Trajetos / Alternativas:
              </span>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {routeDetails.alternatives.map((alt, idx) => {
                  const isSelected = (routeDetails.selectedAlternativeIndex ?? 0) === idx;
                  return (
                    <button
                      type="button"
                      key={alt.id}
                      onClick={() => onSelectAlternative && onSelectAlternative(idx)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-300'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] truncate flex items-center justify-between">
                        <span className="truncate">{alt.title}</span>
                        {isSelected && <span className="text-[10px] text-blue-600 font-bold ml-1">✓</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {alt.distanceText} • {alt.durationText}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Action: View on Map inside the app */}
          {onViewOnMap && (
            <button
              onClick={onViewOnMap}
              className="w-full flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[48px] group"
              title="Ir direto para o mapa e visualizar a rota traçada com linha tracejada"
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 shrink-0 rotate-45 group-hover:scale-110 transition-transform text-cyan-200" />
                <span className="text-sm font-extrabold tracking-wide">Visualizar Rota no Mapa</span>
              </div>
              <span className="text-[10px] text-blue-100 font-normal">
                Vai direto para o mapa • Mantém a navegação ativa
              </span>
            </button>
          )}

          {/* Secondary Action: External Google Maps link */}
          {canNavigateExternal && (
            <a
              href={externalMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Abrir no Google Maps externo (requer internet)</span>
            </a>
          )}

          {/* Collapsible Turn-by-Turn Steps */}
          {routeDetails.steps && routeDetails.steps.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 font-semibold py-1.5 px-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Passo a passo ({routeDetails.steps.length} instruções)</span>
                </div>
                {showSteps ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showSteps && (
                <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                  {routeDetails.steps.map((st, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-white border border-slate-200/80 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div
                          className="text-slate-800 leading-snug [&_b]:font-semibold"
                          dangerouslySetInnerHTML={{ __html: st.instruction }}
                        />
                        {(st.distanceText || st.durationText) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {[st.distanceText, st.durationText].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
