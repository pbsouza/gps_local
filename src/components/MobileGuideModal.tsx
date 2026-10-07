import {
  X,
  Smartphone,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Navigation,
  Share2,
  Globe,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileGuideModal({ isOpen, onClose }: MobileGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                Como Abrir no Google Maps do Celular
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                Guia passo a passo para Android e iPhone (iOS)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 text-slate-800 text-xs">
          {/* Método 1: Google My Maps (O método oficial do Google) */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-sm text-blue-950">
                Método Oficial: Google My Maps (Aparece dentro do Google Maps do Celular)
              </h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              O Google possui uma ferramenta gratuita chamada <strong>Google My Maps</strong> que sincroniza o arquivo KMZ/KML diretamente com o aplicativo Google Maps do seu celular.
            </p>

            <ol className="space-y-2 list-decimal list-inside text-slate-700 bg-white p-3 rounded-lg border border-blue-100">
              <li>
                No computador ou navegador do celular, acesse:{' '}
                <a
                  href="https://mymaps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>mymaps.google.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Faça login com a <strong>mesma conta Google (Gmail)</strong> usada no seu celular.
              </li>
              <li>
                Clique no botão vermelho <strong>"+ Criar um novo mapa"</strong>.
              </li>
              <li>
                Na caixinha cinza à esquerda, clique em <strong>"Importar"</strong> e selecione o seu arquivo <strong>.kmz</strong> ou <strong>.kml</strong>.
              </li>
              <li>
                Pronto! Agora pegue o seu celular e abra o aplicativo <strong>Google Maps</strong>:
                <div className="mt-1.5 ml-4 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                  📱 Toque na aba <strong>"Salvos"</strong> (ou "Você") na parte de baixo &gt; role até o final &gt; toque em <strong>"Mapas"</strong> &gt; toque no mapa que você criou!
                </div>
              </li>
            </ol>
            <p className="text-[11px] text-blue-800 font-medium">
              ✨ Todos os pontos, cores, nomes e perímetros aparecerão desenhados no mapa oficial do seu celular!
            </p>
          </div>

          {/* Método 2: Pelo WhatsApp ou PDF (O mais rápido no dia a dia) */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="font-bold text-sm text-emerald-950">
                Método Mais Rápido: Pelo WhatsApp ou PDF Gerado no Nosso App
              </h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Você não precisa configurar nada se quiser apenas enviar a rota e localização para si mesmo, motoristas ou clientes:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 bg-white p-3 rounded-lg border border-emerald-100">
              <li>
                <strong>Pelo WhatsApp:</strong> clique no botão verde "WhatsApp" ao lado de qualquer localidade no app. No celular, quem receber a mensagem só precisa tocar no link e o <strong>Google Maps abre na hora traçando a rota GPS</strong> partindo de onde a pessoa estiver.
              </li>
              <li>
                <strong>Pelo PDF:</strong> gere o PDF pelo botão "PDF / Imprimir". Ao abrir o PDF no celular ou ler o QR Code com a câmera, o Google Maps abre instantaneamente na rota do local.
              </li>
            </ul>
          </div>

          {/* Método 3: Aplicativo Google Earth */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                Método Direto com o Arquivo: Aplicativo Google Earth Mobile
              </h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Se você quiser abrir o arquivo <strong>.kmz</strong> ou <strong>.kml</strong> diretamente no celular sem usar navegador:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
              <li>
                Instale o aplicativo oficial <strong>Google Earth</strong> na Play Store (Android) ou App Store (iPhone).
              </li>
              <li>
                Envie o arquivo <strong>.kmz</strong> para o seu WhatsApp, Telegram, E-mail ou Google Drive.
              </li>
              <li>
                No celular, toque sobre o arquivo recebido e selecione <strong>"Abrir com o Google Earth"</strong>.
              </li>
              <li>
                O arquivo será carregado em 3D com todas as marcações e polígonos.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span>Dica: O Método 1 (Google My Maps) sincroniza automaticamente com o app Google Maps.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
