import React from 'react';
import {
  Navigation,
  Crosshair,
  Route,
  Battery,
  Radio,
  X,
  Satellite,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TrackedSatelliteDevice, TargetProximityInfo } from '../types/tracker';
import { LatLng } from '../types/kml';
import { getProximityInfo } from '../utils/trackerService';

interface SatelliteRadarWidgetProps {
  device: TrackedSatelliteDevice;
  userLocation: LatLng | null;
  userHeading: number | null;
  onNavigateToDevice: () => void;
  onFocusDevice: () => void;
  onClose: () => void;
}

export function SatelliteRadarWidget({
  device,
  userLocation,
  userHeading,
  onNavigateToDevice,
  onFocusDevice,
  onClose,
}: SatelliteRadarWidgetProps) {
  const [isMinimized, setIsMinimized] = React.useState(false);

  const proximity: TargetProximityInfo | null = userLocation
    ? getProximityInfo(userLocation, { lat: device.lat, lng: device.lng }, userHeading)
    : null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-sm pointer-events-auto select-none">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/50 shadow-2xl p-3 text-white transition-all duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full animate-ping shrink-0"
              style={{ backgroundColor: device.color }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{device.name}</span>
                <span className="font-mono text-[10px] text-cyan-300 font-semibold bg-slate-800 px-1 py-0.2 rounded border border-cyan-500/30">
                  {device.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
              title="Fechar radar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimized compact row */}
        {isMinimized ? (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-bold text-cyan-300">
              {proximity ? proximity.distanceFormatted : 'Acompanhando aparelho'}
            </div>
            <button
              onClick={onNavigateToDevice}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Route className="w-3 h-3" />
              <span>Rota</span>
            </button>
          </div>
        ) : (
          /* Expanded Body */
          <div className="pt-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Distância ao Alvo
                </span>
                <div className="text-2xl font-black text-cyan-300 tracking-tight">
                  {proximity ? proximity.distanceFormatted : '--'}
                </div>
                {proximity && (
                  <div className="text-[10px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <span className="text-amber-400 font-semibold">{proximity.compassDirection}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{proximity.bearingDegrees}°</span>
                  </div>
                )}
              </div>

              {/* Compass Needle Pointer */}
              {proximity && (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500/40 bg-slate-950 flex items-center justify-center relative shadow-inner">
                    <div
                      className="transition-transform duration-500 ease-out"
                      style={{
                        transform: `rotate(${proximity.relativeBearing}deg)`,
                      }}
                    >
                      <Navigation className="w-6 h-6 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
                    </div>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5">Bússola</span>
                </div>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onFocusDevice}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>Centralizar</span>
              </button>

              <button
                onClick={onNavigateToDevice}
                className="py-1.5 px-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Route className="w-3.5 h-3.5 text-white" />
                <span>Traçar Rota</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
