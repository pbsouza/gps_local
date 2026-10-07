import { PlacemarkFeature } from '../types/kml';
import { MapPin, Navigation, Flag, Layers } from 'lucide-react';

interface PlacemarkListProps {
  placemarks: PlacemarkFeature[];
  selectedPlacemark: PlacemarkFeature | null;
  onSelectPlacemark: (pm: PlacemarkFeature) => void;
  onSetAsOrigin: (pm: PlacemarkFeature) => void;
  onSetAsDestination: (pm: PlacemarkFeature) => void;
}

export function PlacemarkList({
  placemarks,
  selectedPlacemark,
  onSelectPlacemark,
  onSetAsOrigin,
  onSetAsDestination,
}: PlacemarkListProps) {
  if (placemarks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 text-center text-slate-500 text-xs">
        <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">Nenhum marcador encontrado</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Tente ajustar sua busca por texto ou reativar categorias no filtro.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 font-medium px-1">
        <span>Lista de Locais ({placemarks.length})</span>
        <span className="text-[10px] text-slate-400">Toque para focar no mapa</span>
      </div>

      <div className="space-y-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1">
        {placemarks.map((pm) => {
          const isSelected = selectedPlacemark?.id === pm.id;
          return (
            <div
              key={pm.id}
              onClick={() => onSelectPlacemark(pm)}
              className={`p-3 rounded-lg border text-xs transition-all cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-300 shadow-2xs ring-1 ring-blue-400/40'
                  : 'bg-slate-50/70 hover:bg-slate-100/90 active:bg-slate-100 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: pm.categoryColor || '#2563eb' }}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 truncate block text-xs sm:text-[13px]">
                      {pm.name}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
                      <span>{pm.category}</span>
                      {pm.geometryType !== 'Point' && (
                        <span className="inline-flex items-center gap-0.5 text-slate-400">
                          • <Layers className="w-2.5 h-2.5" /> {pm.geometryType}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {pm.point && (
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline">
                    {pm.point.lat.toFixed(3)}, {pm.point.lng.toFixed(3)}
                  </span>
                )}
              </div>

              {/* Action buttons inside card with touch-friendly targets */}
              <div
                className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-200/50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onSetAsOrigin(pm)}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white active:bg-emerald-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Definir como ponto de partida"
                >
                  <Navigation className="w-3 h-3 text-emerald-600" />
                  <span>Partir daqui</span>
                </button>

                <button
                  onClick={() => onSetAsDestination(pm)}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white active:bg-blue-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Traçar rota até este local"
                >
                  <Flag className="w-3 h-3 text-blue-600" />
                  <span>Rota até aqui</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
