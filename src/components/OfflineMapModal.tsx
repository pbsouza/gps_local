import { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Download,
  Trash2,
  CheckCircle2,
  X,
  HardDrive,
  Info,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  getTilesForBounds,
  downloadAndCacheTiles,
  getOfflineMapStats,
  clearOfflineMapCache,
  PIO_IX_BOUNDS,
} from '../utils/offlineMapCache';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfflineMapModal({ isOpen, onClose }: OfflineMapModalProps) {
  const isOnline = useOnlineStatus();
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [zoomLevelSelection, setZoomLevelSelection] = useState<'standard' | 'high'>('standard');

  // Load cache stats on open
  useEffect(() => {
    if (isOpen) {
      loadStats();
      setDownloadSuccess(false);
    }
  }, [isOpen]);

  const loadStats = async () => {
    const stats = await getOfflineMapStats('osm-tiles-cache');
    setCachedCount(stats.count);
  };

  const handleStartDownload = async () => {
    if (!isOnline) {
      alert('Você precisa estar conectado à internet para baixar o mapa pela primeira vez.');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      // standard: zoom 11 to 14 (~65 tiles)
      // high: zoom 11 to 15 (~245 tiles)
      const maxZoom = zoomLevelSelection === 'high' ? 15 : 14;
      const tiles = getTilesForBounds(PIO_IX_BOUNDS, 11, maxZoom);

      setProgress({ current: 0, total: tiles.length });

      await downloadAndCacheTiles(tiles, 'osm-tiles-cache', (current, total) => {
        setProgress({ current, total });
      });

      setDownloadSuccess(true);
      await loadStats();
    } catch (err) {
      console.error('Erro ao baixar mapa offline:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Deseja realmente limpar todos os blocos do mapa salvos no cache?')) {
      await clearOfflineMapCache('osm-tiles-cache');
      await loadStats();
      setDownloadSuccess(false);
    }
  };

  if (!isOpen) return null;

  const percent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Modo Offline & Cache</span>
              </h2>
              <div className="flex items-center gap-2 text-xs">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Wifi className="w-3.5 h-3.5" /> Conectado à Internet
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <WifiOff className="w-3.5 h-3.5" /> Sem Internet (Modo Offline)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Blocos de mapa salvos no aparelho:</span>
              <span className="font-mono font-bold text-white text-sm bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                {cachedCount} blocos
              </span>
            </div>

            {cachedCount > 0 ? (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>O mapa continuará visível mesmo quando você estiver sem internet.</span>
              </p>
            ) : (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Baixe os blocos abaixo para garantir visualização sem conexão.</span>
              </p>
            )}
          </div>

          {/* Download Options */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block text-[11px] uppercase tracking-wider">
              Área de Cobertura do Rastreador & Mapa
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setZoomLevelSelection('standard')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  zoomLevelSelection === 'standard'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Padrão</span>
                  {zoomLevelSelection === 'standard' && (
                    <Sparkles className="w-3 h-3 text-blue-400" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Zooms 11 a 14 (~65 blocos, ~2 MB)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setZoomLevelSelection('high')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  zoomLevelSelection === 'high'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Alta Definição</span>
                  {zoomLevelSelection === 'high' && (
                    <Sparkles className="w-3 h-3 text-blue-400" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Zooms 11 a 15 (~245 blocos, ~6 MB)
                </div>
              </button>
            </div>
          </div>

          {/* Download Action & Progress */}
          {isDownloading ? (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-200">
                <span>Baixando blocos do mapa...</span>
                <span>{percent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-150 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-[11px] text-blue-300 text-right">
                {progress.current} de {progress.total} blocos salvos
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartDownload}
              disabled={!isOnline}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                isOnline
                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {cachedCount > 0 ? 'Atualizar / Baixar Novamente' : 'Baixar Mapa para Uso Offline'}
              </span>
            </button>
          )}

          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Blocos do mapa baixados com sucesso! Agora você pode abrir e navegar no mapa mesmo sem conexão com a internet.
              </span>
            </div>
          )}

          {/* Info Card */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Como funciona no campo ou sem sinal:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>O GPS do seu celular funciona via satélite mesmo sem sinal de operadora.</li>
              <li>Todos os pontos e linhas do arquivo KMZ ficam salvos no aplicativo.</li>
              <li>Os blocos de mapa baixados abrem instantaneamente direto da memória do aparelho.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {cachedCount > 0 && (
            <button
              onClick={handleClearCache}
              disabled={isDownloading}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar cache</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
