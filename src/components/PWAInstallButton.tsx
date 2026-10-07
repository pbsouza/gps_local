import { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'sidebar' | 'menu';
}

export function PWAInstallButton({ className = '', variant = 'default' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  // If already running standalone (installed as WebAPK / PWA)
  if (isInstalled) {
    if (variant === 'menu' || variant === 'sidebar') {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Aplicativo já instalado</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowAndroidModal(true);
      }
    } else {
      setShowAndroidModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer border border-blue-400/40 shrink-0 ${className}`}
          title="Instalar aplicativo no dispositivo"
          aria-label="Instalar Aplicativo"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar</span>
        </button>
      ) : variant === 'sidebar' ? (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white shadow-md transition-all cursor-pointer text-left ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <img
              src="./icons/pwa-192x192.png"
              alt="Icon"
              className="w-8 h-8 rounded-lg shadow-inner shrink-0"
            />
            <div>
              <div className="font-bold text-xs flex items-center gap-1">
                <span>Instalar Aplicativo</span>
                <Sparkles className="w-3 h-3 text-amber-300" />
              </div>
              <div className="text-[10px] text-blue-100">
                Acesse direto da tela inicial, offline
              </div>
            </div>
          </div>
          <Download className="w-4 h-4 text-white shrink-0 ml-2" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer min-h-[36px] ${className}`}
          title="Instalar aplicativo no celular ou computador"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar App</span>
        </button>
      )}

      {/* iOS Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Instalar no iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>Para instalar este aplicativo no seu Safari:</p>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <Share className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">1. Toque em Compartilhar</span>
                  <span className="text-[11px] text-slate-400">Na barra inferior do Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">2. Adicionar à Tela de Início</span>
                  <span className="text-[11px] text-slate-400">Role para baixo e selecione essa opção.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Android / Chrome Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="./icons/pwa-192x192.png"
                  alt="Icon"
                  className="w-7 h-7 rounded-lg shrink-0"
                />
                <h3 className="text-sm font-bold">Instalar no Android</h3>
              </div>
              <button
                onClick={() => setShowAndroidModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>Para adicionar o aplicativo à tela inicial do seu celular com o novo ícone:</p>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-white block">No menu do Chrome</span>
                  <span className="text-[11px] text-slate-400">
                    Toque nos <strong>três pontinhos (⋮)</strong> no topo do Chrome.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white block">Toque em "Criar atalho" ou "Instalar"</span>
                  <span className="text-[11px] text-slate-400">
                    O ícone transparente será fixado na sua tela inicial e abrirá o aplicativo diretamente!
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidModal(false)}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
