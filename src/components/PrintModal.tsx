import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  MapPin,
  Copy,
  Check,
  Navigation,
  FileText,
  Loader2,
  Compass,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  MessageSquare,
} from 'lucide-react';
import { PlacemarkFeature, LatLng, RouteResultDetails } from '../types/kml';
import {
  createOverviewMapCanvas,
  generateAndDownloadPdf,
  createWhatsAppUrl,
} from '../utils/pdfGenerator';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  placemarks: PlacemarkFeature[];
  origin: LatLng | null;
  originLabel: string;
  routeDetails: RouteResultDetails | null;
}

export function PrintModal({
  isOpen,
  onClose,
  documentTitle,
  placemarks,
  origin,
  originLabel,
  routeDetails,
}: PrintModalProps) {
  // Multiselect state for which placemarks to include in PDF
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(placemarks.map((p) => p.id));
  });

  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState(
    documentTitle ? `Roteiro & Locais - ${documentTitle}` : 'Mapa de Localidades & Rotas'
  );
  const [showQrCodes, setShowQrCodes] = useState(true);
  const [useOriginInLink, setUseOriginInLink] = useState(false);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [overviewMapImage, setOverviewMapImage] = useState<string>('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [printBlockedNotice, setPrintBlockedNotice] = useState(false);

  // Sync selectedIds when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(placemarks.map((p) => p.id)));
      setCustomTitle(
        documentTitle ? `Roteiro & Locais - ${documentTitle}` : 'Mapa de Localidades & Rotas'
      );
      if (placemarks.length > 0) {
        setActivePreviewId(placemarks[0].id);
      }
    }
  }, [isOpen, placemarks, documentTitle]);

  // Selected placemarks
  const selectedPlacemarks = useMemo(() => {
    return placemarks.filter((p) => selectedIds.has(p.id) && p.point);
  }, [placemarks, selectedIds]);

  const activePlacemark = useMemo(() => {
    if (!activePreviewId) return selectedPlacemarks[0] || null;
    return placemarks.find((p) => p.id === activePreviewId) || selectedPlacemarks[0] || null;
  }, [activePreviewId, placemarks, selectedPlacemarks]);

  // Generate Google Maps navigation link
  const getMapsUrl = (pm: PlacemarkFeature): string => {
    if (!pm.point) return '';
    if (useOriginInLink && origin) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${pm.point.lat},${pm.point.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${pm.point.lat},${pm.point.lng}`;
  };

  // Generate single Territory Limits Overview Map and QR codes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const qrs: Record<string, string> = {};

    async function generateAssets() {
      // 1. Generate Single Overview Map showing territory limits & all locations
      const overviewData = createOverviewMapCanvas(selectedPlacemarks, 1000, 460);

      // 2. Generate QR codes for each location
      for (const pm of selectedPlacemarks) {
        if (!pm.point) continue;
        const url = getMapsUrl(pm);
        if (url) {
          try {
            const qrData = await QRCode.toDataURL(url, {
              width: 140,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
            qrs[pm.id] = qrData;
          } catch (e) {
            console.warn('QR error:', e);
          }
        }
      }

      if (isMounted) {
        setOverviewMapImage(overviewData);
        setQrCodeMap(qrs);
      }
    }

    generateAssets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedPlacemarks, useOriginInLink, origin]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(placemarks.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Real client-side PDF download
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setExportSuccess(false);

      await generateAndDownloadPdf({
        title: customTitle,
        placemarks: selectedPlacemarks,
        origin: useOriginInLink ? origin : null,
        originLabel,
        routeDetails,
      });

      setIsExportingPdf(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      setIsExportingPdf(false);
      console.error('Erro ao gerar PDF', err);
    }
  };

  // Safe Print Trigger
  const handleSafePrint = () => {
    try {
      window.print();
    } catch {
      setPrintBlockedNotice(true);
      setTimeout(() => setPrintBlockedNotice(false), 5000);
    }
  };

  // Copy all links
  const handleCopyAllLinks = () => {
    const text = selectedPlacemarks
      .map((p, idx) => {
        const url = getMapsUrl(p);
        return `${idx + 1}. ${p.name} (${p.category})\nLink do Google Maps: ${url}\n`;
      })
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Export self-contained standalone HTML file
  const handleDownloadHtml = () => {
    const cardsHtml = selectedPlacemarks
      .map((pm, idx) => {
        const url = getMapsUrl(pm);
        const waUrl = createWhatsAppUrl(pm);
        const qrImg = qrCodeMap[pm.id] || '';
        return `
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 14px; background: #fff; page-break-inside: avoid; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: bold; color: #0f172a;">${idx + 1}. ${pm.name}</div>
            <div style="font-size: 12px; font-family: monospace; color: #64748b; margin-top: 4px;">Lat: ${pm.point?.lat.toFixed(5)}, Lng: ${pm.point?.lng.toFixed(5)}</div>
            <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="${url}" target="_blank" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                🧭 Abrir Rota no Google Maps
              </a>
              <a href="${waUrl}" target="_blank" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                💬 Enviar no WhatsApp
              </a>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; word-break: break-all;">${url}</div>
          </div>
          ${qrImg ? `<div style="text-align: center; shrink-0;"><img src="${qrImg}" style="width: 65px; height: 65px; border: 1px solid #cbd5e1; padding: 2px; border-radius: 6px;" alt="QR Code"/><div style="font-size: 9px; color: #64748b; margin-top: 2px;">Ler no celular</div></div>` : ''}
        </div>
      `;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${customTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 820px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h1 { margin-top: 0; font-size: 22px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
    @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${customTitle}</h1>
    <p style="color: #64748b; font-size: 13px; margin-bottom: 20px;">
      Total: <strong>${selectedPlacemarks.length} localidades</strong> • Mapa de limites territoriais e links diretos inclusos.
    </p>

    <!-- Mapa Geral dos Limites do Território (Apenas no início) -->
    ${overviewMapImage ? `
    <div style="margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
      <img src="${overviewMapImage}" style="width: 100%; display: block;" alt="Mapa de Limites do Território"/>
    </div>
    ` : ''}

    <div>${cardsHtml}</div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">Exportar PDF com Mapa do Território</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                Mapa dos limites no começo do PDF + botões de rota e WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Options */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-md">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Título do Documento:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 pt-1 sm:pt-0">
              {/* Direct PDF Download button */}
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || selectedPlacemarks.length === 0}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Download className="w-4 h-4 shrink-0" />
                )}
                <span>Baixar Arquivo PDF</span>
              </button>

              {/* Standalone HTML Report */}
              <button
                onClick={handleDownloadHtml}
                disabled={selectedPlacemarks.length === 0}
                className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
                title="Baixar como arquivo HTML portátil"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Baixar HTML</span>
              </button>

              {/* Copy Links */}
              <button
                onClick={handleCopyAllLinks}
                className="px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
              >
                {copiedAll ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{copiedAll ? 'Copiado!' : 'Copiar Links'}</span>
              </button>
            </div>
          </div>

          {/* Quick status messages */}
          {exportSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>O arquivo PDF com o mapa de limites e links foi gerado e baixado com sucesso!</span>
            </div>
          )}

          {printBlockedNotice && (
            <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Dica: Use o botão azul "Baixar Arquivo PDF" para salvar o documento diretamente.</span>
            </div>
          )}
        </div>

        {/* Modal Main Body: Single Overview Map + Location list */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left / Top: Single Territory Overview Map Preview (Beginning of PDF) */}
          <div className="md:col-span-5 p-4 bg-slate-50 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Mapa dos Limites do Território</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                Início do PDF
              </span>
            </div>

            {/* Overview Map Preview */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-3 space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-100 aspect-16/9 flex items-center justify-center">
                {overviewMapImage ? (
                  <img
                    src={overviewMapImage}
                    alt="Mapa dos Limites do Território com Localidades"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Desenhando limites e localidades...</span>
                  </div>
                )}

                <div className="absolute top-2 left-2 bg-slate-900/85 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                  Único mapa no início do PDF ({selectedPlacemarks.length} locais)
                </div>
              </div>

              {/* Active Placemark Inspector & Test Actions */}
              {activePlacemark && activePlacemark.point && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {activePlacemark.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">
                      {activePlacemark.point.lat.toFixed(4)}, {activePlacemark.point.lng.toFixed(4)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getMapsUrl(activePlacemark)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 rotate-45" />
                      <span>Testar Rota</span>
                    </a>

                    <a
                      href={createWhatsAppUrl(activePlacemark)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    💡 A mensagem do WhatsApp contém o nome, coordenadas e rota direta (sem a categoria).
                  </p>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Estrutura do PDF Gerado:</span>
              </div>
              <ul className="text-[11px] text-blue-800/90 space-y-1 list-disc list-inside">
                <li>
                  <strong>Começo do PDF:</strong> desenho exclusivo com os limites do mapa e o nome de todas as localidades.
                </li>
                <li>
                  <strong>Sem mini-mapas individuais:</strong> cartões limpos e compactos com botões diretos de navegação e WhatsApp.
                </li>
                <li>
                  <strong>WhatsApp limpo:</strong> texto direto com o local, coordenadas e link de rota do Google Maps.
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Clean List of Items (NO MINI-MAPS IN ROWS) */}
          <div className="md:col-span-7 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Localidades ({selectedPlacemarks.length} de {placemarks.length})
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={selectAll}
                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={deselectAll}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {placemarks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhuma localidade disponível para exportar.
              </div>
            ) : (
              <div className="space-y-2">
                {placemarks.map((pm, idx) => {
                  const isSelected = selectedIds.has(pm.id);
                  const isFocused = activePreviewId === pm.id;
                  const url = getMapsUrl(pm);
                  const qr = qrCodeMap[pm.id];

                  return (
                    <div
                      key={pm.id}
                      onClick={() => setActivePreviewId(pm.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isFocused
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox + Number badge + Info */}
                      <div className="flex items-center gap-2.5 truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(pm.id);
                          }}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        {/* Number Index Badge */}
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="truncate">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {pm.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Lat: {pm.point?.lat.toFixed(4)}, Lng: {pm.point?.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Right Actions: Google Maps & WhatsApp */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {qr && showQrCodes && (
                          <img
                            src={qr}
                            alt="QR"
                            className="w-7 h-7 rounded border border-slate-200 hidden sm:block"
                          />
                        )}

                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Abrir rota no Google Maps"
                        >
                          <Navigation className="w-3 h-3 rotate-45 text-blue-600" />
                          <span className="hidden sm:inline">Rota</span>
                        </a>

                        <a
                          href={createWhatsAppUrl(pm)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Enviar dados desta localidade no WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {selectedPlacemarks.length} localidades prontas para gerar PDF
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || selectedPlacemarks.length === 0}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Gerar e Baixar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
