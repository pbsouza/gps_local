import { useState } from 'react';
import { WifiOff, HardDrive, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineStatusBannerProps {
  onOpenOfflineModal: () => void;
}

export function OfflineStatusBanner({ onOpenOfflineModal }: OfflineStatusBannerProps) {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // If online or manually dismissed during this session
  if (isOnline || dismissed) {
    return null;
  }

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-md w-[92%] bg-amber-950/90 border border-amber-600/70 text-amber-100 px-3.5 py-2 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-amber-200 block truncate">
            Modo Offline Ativo
          </span>
          <span className="text-[11px] text-amber-300/80 truncate block">
            Navegando com mapa e dados salvos no cache.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenOfflineModal}
          className="px-2 py-1 rounded-md bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-semibold text-[11px] border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1"
        >
          <HardDrive className="w-3 h-3" />
          <span>Cache</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-amber-400 hover:text-white transition-colors cursor-pointer"
          title="Ocultar aviso"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
