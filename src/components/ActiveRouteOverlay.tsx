import { useState, useEffect } from 'react';
import { RouteResultDetails, TravelMode, LatLng, LiveNavigationState } from '../types/kml';
import {
  Navigation,
  Car,
  Footprints,
  Bike,
  Bus,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Milestone,
  LocateFixed,
  Gauge,
  Sparkles,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  RotateCcw,
  Flag,
} from 'lucide-react';
import { formatDistance, formatDuration } from '../utils/routeGuidance';

interface ActiveRouteOverlayProps {
  routeDetails: RouteResultDetails | null;
  origin: LatLng | null;
  originLabel: string;
  destination: LatLng | null;
  destinationLabel: string;
  travelMode: TravelMode;
  isLiveNavigating: boolean;
  liveNavState: LiveNavigationState;
  onClearRoute: () => void;
  onFitRouteBounds: () => void;
  onToggleLiveNavigation: () => void;
  onRecenterOnUser: () => void;
  onSelectAlternative?: (index: number) => void;
}

function renderManeuverIcon(type?: string, modifier?: string) {
  if (type === 'arrive') return <Flag className="w-6 h-6 text-emerald-300" />;
  if (modifier === 'left' || modifier === 'sharp left') return <CornerUpLeft className="w-6 h-6 text-emerald-300" />;
  if (modifier === 'right' || modifier === 'sharp right') return <CornerUpRight className="w-6 h-6 text-emerald-300" />;
  if (modifier === 'slight left') return <ArrowUpLeft className="w-6 h-6 text-emerald-300" />;
  if (modifier === 'slight right') return <ArrowUpRight className="w-6 h-6 text-emerald-300" />;
  if (modifier === 'u-turn') return <RotateCcw className="w-6 h-6 text-emerald-300" />;
  return <ArrowUp className="w-6 h-6 text-emerald-300" />;
}

export function ActiveRouteOverlay({
  routeDetails,
  origin,
  originLabel,
  destination,
  destinationLabel,
  travelMode,
  isLiveNavigating,
  liveNavState,
  onClearRoute,
  onFitRouteBounds,
  onToggleLiveNavigation,
  onRecenterOnUser,
  onSelectAlternative,
}: ActiveRouteOverlayProps) {
  const [isExpandedSteps, setIsExpandedSteps] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAllHighways, setShowAllHighways] = useState(false);

  // Auto-minimize when live GPS navigation starts so the map and blue line are clearly visible
  useEffect(() => {
    if (isLiveNavigating) {
      setIsMinimized(true);
    }
  }, [isLiveNavigating]);

  if (!routeDetails || !origin || !destination) {
    return null;
  }

  const travelIcons: Record<TravelMode, any> = {
    DRIVING: Car,
    WALKING: Footprints,
    BICYCLING: Bike,
    TRANSIT: Bus,
  };
  const Icon = travelIcons[travelMode] || Car;

  const externalMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${travelMode.toLowerCase()}`;

  const highways = routeDetails.highways || [];
  const alternatives = routeDetails.alternatives || [];
  const selectedIndex = routeDetails.selectedAlternativeIndex ?? 0;

  // Real-time remaining values if live navigating
  const displayDistance =
    isLiveNavigating && liveNavState.remainingDistanceMeters !== null
      ? formatDistance(liveNavState.remainingDistanceMeters)
      : routeDetails.distanceText;

  const displayDuration =
    isLiveNavigating && liveNavState.remainingDurationSeconds !== null
      ? formatDuration(liveNavState.remainingDurationSeconds)
      : routeDetails.durationText;

  // -------------------------------------------------------------
  // MODE 1: MINIMIZED LIVE NAVIGATION (Google Maps style HUD)
  // Keeps 90%+ of the screen clear for the map and the blue route!
  // -------------------------------------------------------------
  if (isMinimized && isLiveNavigating) {
    const nextStep = liveNavState.nextStep || (routeDetails.steps && routeDetails.steps.length > 0 ? routeDetails.steps[0] : null);

    return (
      <>
        {/* Top Floating Turn Maneuver Banner */}
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-30 bg-emerald-950/95 border border-emerald-600/80 rounded-2xl shadow-2xl backdrop-blur-md text-white p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-800/90 border border-emerald-500/50 flex items-center justify-center shrink-0 shadow-inner">
              {renderManeuverIcon(nextStep?.type, nextStep?.modifier)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-emerald-200 tracking-wide font-mono">
                  {nextStep?.distanceText || 'Em frente'}
                </span>
                {nextStep?.highway && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/30 text-amber-300 border border-amber-400/50 font-mono font-bold text-[10px]">
                    {nextStep.highway}
                  </span>
                )}
              </div>
              <div
                className="text-xs text-white font-medium truncate mt-0.5 [&_b]:text-emerald-200 [&_b]:font-bold"
                dangerouslySetInnerHTML={{
                  __html: nextStep?.instruction || 'Siga pela rota azul traçada no mapa',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onRecenterOnUser}
              className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 active:bg-emerald-600 text-white transition-colors cursor-pointer"
              title="Centralizar no veículo"
              aria-label="Centralizar no veículo"
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Expandir detalhes e rodovias"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Instruções</span>
            </button>
          </div>
        </div>

        {/* Bottom Floating Navigation Status Pill */}
        <div className="absolute bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md text-white flex items-center gap-3 sm:gap-4 max-w-[95%] sm:max-w-none">
          {/* Speedometer */}
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
            <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {liveNavState.speedKmh !== null && liveNavState.speedKmh > 1
                ? `${Math.round(liveNavState.speedKmh)} km/h`
                : 'Parado'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Remaining distance & time */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="font-mono text-cyan-300">{displayDistance}</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="text-white">{displayDuration}</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Expandir detalhes da rota"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleLiveNavigation}
              className="py-1 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              title="Parar navegação em tempo real"
            >
              <span>Sair</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // MODE 2: MINIMIZED NON-LIVE ROUTE (Slim Bar)
  // Allows user to view the full map and blue line without live GPS
  // -------------------------------------------------------------
  if (isMinimized && !isLiveNavigating) {
    return (
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-20 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-white p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs font-bold text-white truncate">
              <span className="truncate max-w-[120px]">{destinationLabel}</span>
              <span className="text-cyan-400 font-mono font-bold">• {displayDistance}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {routeDetails.summary || 'Rota traçada no mapa'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleLiveNavigation}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Iniciar GPS ao vivo"
          >
            <Navigation className="w-3.5 h-3.5 rotate-45" />
            <span className="hidden xs:inline">Navegar</span>
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Expandir detalhes"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            onClick={onClearRoute}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
            title="Fechar rota"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 3: FULL EXPANDED OVERLAY (Detailed with Minimize Button)
  // -------------------------------------------------------------
  const visibleHighways = showAllHighways ? highways : highways.slice(0, 6);
  const hiddenHighwaysCount = highways.length - 6;

  return (
    <div className="absolute top-3 left-3 sm:left-4 z-20 max-w-sm sm:max-w-md w-[92%] sm:w-auto max-h-[85vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-white overflow-hidden transition-all duration-200">
      {/* Live Navigation Top Bar if active */}
      {isLiveNavigating && (
        <div className="bg-emerald-950/90 border-b border-emerald-600/60 px-3 py-2 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-bold text-white tracking-wide">Navegação em Tempo Real</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-mono font-bold text-emerald-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {liveNavState.speedKmh !== null && liveNavState.speedKmh > 1
                  ? `${Math.round(liveNavState.speedKmh)} km/h`
                  : 'Parado'}
              </span>
            </div>

            <button
              onClick={onRecenterOnUser}
              className="p-1 rounded-md bg-emerald-800/80 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              title="Centralizar mapa no veículo"
            >
              <LocateFixed className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Turn Banner if active */}
      {isLiveNavigating && liveNavState.nextStep && (
        <div className="bg-emerald-900/95 border-b border-emerald-700/80 p-3 flex items-start gap-3 shadow-inner shrink-0">
          <div className="p-2 rounded-xl bg-emerald-800 text-white shrink-0 mt-0.5 border border-emerald-600/50">
            {renderManeuverIcon(liveNavState.nextStep.type, liveNavState.nextStep.modifier)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{liveNavState.nextStep.distanceText || 'Em frente'}</span>
              {liveNavState.nextStep.highway && (
                <span className="px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-300 border border-amber-400/50 font-mono text-[9px]">
                  {liveNavState.nextStep.highway}
                </span>
              )}
            </div>
            <div
              className="text-xs text-white font-medium leading-snug mt-0.5 [&_b]:font-bold [&_b]:text-emerald-200"
              dangerouslySetInnerHTML={{ __html: liveNavState.nextStep.instruction }}
            />
          </div>
        </div>
      )}

      {/* Main summary header & controls */}
      <div className="p-3 sm:p-3.5 space-y-2.5 overflow-y-auto flex-1">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <span className="truncate max-w-[90px] sm:max-w-[120px]" title={originLabel}>
                  {originLabel}
                </span>
                <span className="text-slate-400 font-normal">➔</span>
                <span className="truncate max-w-[90px] sm:max-w-[120px] text-cyan-300" title={destinationLabel}>
                  {destinationLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                <span>{routeDetails.summary || 'Rota traçada no mapa'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons including the Minimize Button */}
          <div className="flex items-center gap-1 shrink-0">
            {/* MINIMIZE BUTTON REQUESTED BY USER */}
            <button
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-semibold transition-all cursor-pointer"
              title="Minimizar tela para ver o mapa livre"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Minimizar</span>
            </button>

            <button
              onClick={onFitRouteBounds}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Centralizar toda a rota no mapa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClearRoute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
              title="Fechar rota"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Highway Badges list (Cleanly limited to avoid covering entire screen) */}
        {highways.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Rodovias do Percurso:
              </span>
              {hiddenHighwaysCount > 0 && (
                <button
                  onClick={() => setShowAllHighways(!showAllHighways)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  {showAllHighways ? 'Recolher' : `+${hiddenHighwaysCount} rodovias`}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 max-h-20 overflow-y-auto pr-0.5">
              {visibleHighways.map((hw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono font-bold text-[10px] tracking-wide shadow-2xs"
                >
                  {hw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Routes Switcher */}
        {alternatives.length > 1 && onSelectAlternative && (
          <div className="space-y-1 pt-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Opções de Melhores Trajetos:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {alternatives.map((alt, idx) => (
                <button
                  key={alt.id}
                  onClick={() => onSelectAlternative(idx)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedIndex === idx
                      ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400/50'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate flex items-center justify-between">
                    <span>{alt.title}</span>
                    {selectedIndex === idx && <Sparkles className="w-3 h-3 text-cyan-300" />}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 mt-0.5">
                    {alt.distanceText} • {alt.durationText}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Google Maps Trajectory Style Badge */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-[11px]">
          <div className="flex items-center gap-2">
            <div className="w-11 h-3 rounded-full bg-blue-600 border border-blue-800 relative flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              <div className="w-full h-0.5 border-t-2 border-dashed border-white" />
            </div>
            <span className="text-blue-200 font-semibold text-[10px]">
              Trajetória com linha tracejada (Google Maps)
            </span>
          </div>
          <span className="text-[9px] text-cyan-300 font-mono font-bold">Ativa</span>
        </div>

        {/* Big metrics */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight font-mono">
              {displayDistance}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-cyan-400 font-mono">
              • {displayDuration}
            </span>
          </div>

          <button
            onClick={() => setIsExpandedSteps(!isExpandedSteps)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-950/40"
          >
            <span>{isExpandedSteps ? 'Ocultar passos' : 'Ver passo a passo'}</span>
            {isExpandedSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Real-Time Live Navigation Toggle Button */}
        <button
          onClick={onToggleLiveNavigation}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
            isLiveNavigating
              ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-400/40'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white border border-emerald-400/40'
          }`}
        >
          <Navigation className={`w-4 h-4 shrink-0 ${isLiveNavigating ? 'animate-pulse text-white' : 'rotate-45'}`} />
          <span>
            {isLiveNavigating
              ? 'Parar Navegação em Tempo Real'
              : 'Navegar em Tempo Real (GPS ao vivo)'}
          </span>
        </button>
      </div>

      {/* Expandable Step-by-Step Directions */}
      {isExpandedSteps && routeDetails.steps && routeDetails.steps.length > 0 && (
        <div className="border-t border-slate-800 bg-slate-950/95 p-3 max-h-56 sm:max-h-64 overflow-y-auto space-y-2 text-xs shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <Milestone className="w-3.5 h-3.5 text-blue-400" />
              <span>Instruções ({routeDetails.steps.length} etapas)</span>
            </div>
            <a
              href={externalMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
              title="Abrir no Google Maps externo (requer internet)"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1.5 pr-0.5">
            {routeDetails.steps.map((st, i) => (
              <div
                key={i}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800/90 flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div
                    className="text-slate-200 leading-snug text-[11px] [&_b]:text-white [&_b]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: st.instruction }}
                  />
                  {(st.distanceText || st.durationText) && (
                    <div className="text-[10px] text-cyan-400 font-medium mt-0.5 font-mono">
                      {[st.distanceText, st.durationText].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
