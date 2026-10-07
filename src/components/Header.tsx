import { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Upload,
  Navigation,
  Menu,
  X,
  Route,
  Printer,
  FileJson,
  Smartphone,
  MoreVertical,
  HardDrive,
  Radio,
  Crosshair,
  Satellite,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  fileName: string;
  totalPlacemarks: number;
  filteredCount: number;
  hasActiveRoute: boolean;
  sidebarOpen: boolean;
  isTransmitting?: boolean;
  trackedDevicesCount?: number;
  onToggleSidebar: () => void;
  onOpenUploadTab: () => void;
  onRequestGps: () => void;
  onOpenRouteTab: () => void;
  onOpenTrackerTab: () => void;
  onToggleTransmission?: () => void;
  onOpenPrintModal: () => void;
  onOpenJsonModal: () => void;
  onOpenMobileGuide: () => void;
  onOpenOfflineModal: () => void;
}

export function Header({
  fileName,
  totalPlacemarks,
  filteredCount,
  hasActiveRoute,
  sidebarOpen,
  isTransmitting = false,
  trackedDevicesCount = 0,
  onToggleSidebar,
  onOpenUploadTab,
  onRequestGps,
  onOpenRouteTab,
  onOpenTrackerTab,
  onToggleTransmission,
  onOpenPrintModal,
  onOpenJsonModal,
  onOpenMobileGuide,
  onOpenOfflineModal,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="h-14 bg-slate-900 text-white px-2.5 sm:px-4 md:px-5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0 z-30 select-none relative">
      {/* Brand & Drawer Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors shrink-0"
          aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        >
          {sidebarOpen ? <X className="w-5 h-5 text-rose-300" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={onOpenTrackerTab}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/40 flex items-center justify-center shadow-sm shrink-0">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white flex items-center gap-1.5 truncate">
              <span className="truncate">GPS Rede</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-1 py-0.2 rounded shrink-0">
                Satélite
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-[200px] md:max-w-xs">
              Rastreador GPS & Localizador por ID
            </p>
          </div>
        </div>

        {/* Current File indicator - Desktop */}
        {fileName && totalPlacemarks > 0 && (
          <div className="hidden xl:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800 text-xs text-slate-300">
            <span className="font-medium text-slate-200 truncate max-w-[180px]" title={fileName}>
              📄 {fileName}
            </span>
            <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full shrink-0">
              {filteredCount} de {totalPlacemarks} visíveis
            </span>
          </div>
        )}
      </div>

      {/* Desktop Actions (md and up) */}
      <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
        {/* Tracker Panel Trigger */}
        <button
          onClick={onOpenTrackerTab}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all border border-cyan-500/40 shadow-sm cursor-pointer relative"
          title="Abrir painel de localização de outros aparelhos por ID"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Localizar Aparelho</span>
          {trackedDevicesCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {trackedDevicesCount}
            </span>
          )}
        </button>

        {/* Transmitter Status / Toggle */}
        <button
          onClick={onToggleTransmission ? onToggleTransmission : onOpenTrackerTab}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
            isTransmitting
              ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/50 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title={isTransmitting ? 'Sinal GPS ativo e transmitindo' : 'Transmitir meu sinal GPS para ser encontrado'}
        >
          <Radio className={`w-3.5 h-3.5 ${isTransmitting ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          <span>{isTransmitting ? 'Baliza Ativa' : 'Meu Transmissor'}</span>
        </button>

        <button
          onClick={onRequestGps}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
          title="Detectar minha localização atual com GPS"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>Onde Estou</span>
        </button>

        <button
          onClick={onOpenRouteTab}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
            hasActiveRoute
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
          }`}
          title={hasActiveRoute ? 'Painel de rotas ativas' : 'Abrir painel de rotas'}
        >
          <Route className="w-3.5 h-3.5 text-cyan-300" />
          <span>{hasActiveRoute ? 'Rota Ativa' : 'Traçar Rota'}</span>
        </button>

        <button
          onClick={onOpenOfflineModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors shadow-sm cursor-pointer border border-amber-500/40"
          title="Configurar modo offline e baixar blocos do mapa"
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline</span>
        </button>

        <button
          onClick={onOpenPrintModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer border border-emerald-500"
          title="Imprimir relatório do mapa e coordenadas"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>

        <button
          onClick={onOpenUploadTab}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          title="Abrir arquivo KMZ ou KML opcional"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>KMZ</span>
        </button>

        <PWAInstallButton />
      </div>

      {/* Mobile Actions (< md): Compact touch buttons + Dropdown */}
      <div className="flex md:hidden items-center gap-1.5" ref={menuRef}>
        {/* Direct Install button on mobile */}
        <PWAInstallButton variant="compact" />

        {/* Quick Tracker button on mobile */}
        <button
          onClick={onOpenTrackerTab}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border shrink-0 relative ${
            isTransmitting
              ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500'
              : 'bg-slate-800 text-cyan-400 border-slate-700'
          }`}
          title="Rastreador Satélite por ID"
          aria-label="Rastreador Satélite"
        >
          <Satellite className="w-4 h-4" />
          {isTransmitting && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
          )}
        </button>

        {/* Quick GPS button on mobile */}
        <button
          onClick={onRequestGps}
          className="w-9 h-9 rounded-lg bg-slate-800 active:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-slate-700 shrink-0"
          title="Detectar minha localização GPS"
          aria-label="Minha Localização GPS"
        >
          <Navigation className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Quick Route button on mobile */}
        <button
          onClick={onOpenRouteTab}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border shrink-0 ${
            hasActiveRoute
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-slate-800 active:bg-slate-700 text-cyan-300 border-slate-700'
          }`}
          title={hasActiveRoute ? 'Ver Rota no Mapa' : 'Traçar Rotas'}
          aria-label={hasActiveRoute ? 'Ver Rota no Mapa' : 'Traçar Rotas'}
        >
          <Route className="w-4 h-4" />
        </button>

        {/* More Tools Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border shrink-0 ${
            mobileMenuOpen
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-800 active:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Mais opções e exportações"
          aria-label="Mais opções"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu Modal for Mobile */}
        {mobileMenuOpen && (
          <div className="absolute top-14 right-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
              <span>Opções do Aplicativo</span>
            </div>

            <div className="py-1">
              <PWAInstallButton variant="sidebar" className="w-full" />
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrackerTab();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-cyan-300 hover:text-white transition-colors text-left"
            >
              <Satellite className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="font-semibold">Localizador Satélite & GPS</div>
                <div className="text-[10px] text-slate-400">Rastrear por ID ou emitir sinal</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenOfflineModal();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
            >
              <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-amber-300">Modo Offline & Cache</div>
                <div className="text-[10px] text-slate-400">Baixar mapa para usar sem internet</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPrintModal();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
            >
              <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold">PDF / Imprimir Mapa</div>
                <div className="text-[10px] text-slate-400">Baixar relatório de posições</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenJsonModal();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
            >
              <FileJson className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="font-semibold">Exportar JSON / GeoJSON</div>
                <div className="text-[10px] text-slate-400">Dados estruturados e geometrias</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUploadTab();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
            >
              <Upload className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold">Abrir Arquivo KMZ / KML</div>
                <div className="text-[10px] text-slate-400">Carregar camadas cartográficas</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMobileGuide();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left border-t border-slate-800/80 mt-1 pt-2"
            >
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold">Guia para Celular</div>
                <div className="text-[10px] text-slate-400">Instruções de navegação externa</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
