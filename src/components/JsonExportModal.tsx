import { useState, useMemo, ChangeEvent, DragEvent } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileJson,
  Upload,
  Globe,
  Database,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { KmlDocument, PlacemarkFeature } from '../types/kml';
import {
  kmlToGeoJson,
  kmlToStructuredJson,
  downloadJsonFile,
  convertKmzFileToJson,
  JsonExportFormat,
} from '../utils/jsonConverter';

interface JsonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kmlDoc: KmlDocument;
  filteredPlacemarks: PlacemarkFeature[];
  onLoadFileToMap?: (file: File) => void;
}

export function JsonExportModal({
  isOpen,
  onClose,
  kmlDoc,
  filteredPlacemarks,
  onLoadFileToMap,
}: JsonExportModalProps) {
  // Format state
  const [format, setFormat] = useState<JsonExportFormat>('geojson');
  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [minified, setMinified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Drop / Direct File Conversion state
  const [activeTab, setActiveTab] = useState<'current' | 'convert_new'>('current');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [convertedDoc, setConvertedDoc] = useState<KmlDocument | null>(null);
  const [isConvertingFile, setIsConvertingFile] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Active document to convert
  const targetDoc = activeTab === 'convert_new' && convertedDoc ? convertedDoc : kmlDoc;

  // Selected placemarks
  const activePlacemarks = useMemo(() => {
    if (activeTab === 'convert_new' && convertedDoc) {
      return convertedDoc.placemarks;
    }
    return scope === 'filtered' ? filteredPlacemarks : kmlDoc.placemarks;
  }, [activeTab, convertedDoc, scope, filteredPlacemarks, kmlDoc.placemarks]);

  // Generate the JSON object
  const generatedData = useMemo(() => {
    if (format === 'geojson') {
      return kmlToGeoJson(targetDoc, activePlacemarks);
    } else {
      return kmlToStructuredJson(targetDoc, activePlacemarks);
    }
  }, [format, targetDoc, activePlacemarks]);

  // Formatted JSON string
  const jsonText = useMemo(() => {
    return JSON.stringify(generatedData, null, minified ? 0 : 2);
  }, [generatedData, minified]);

  // File size calculation
  const fileSizeInfo = useMemo(() => {
    const bytes = new Blob([jsonText]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [jsonText]);

  // Line count
  const lineCount = useMemo(() => {
    if (minified) return 1;
    return jsonText.split('\n').length;
  }, [jsonText, minified]);

  // Target filename
  const targetFileName = useMemo(() => {
    const base = (targetDoc.fileName || 'mapa_dados')
      .replace(/\.(kmz|kml)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    return format === 'geojson' ? `${base}.geojson` : `${base}.json`;
  }, [targetDoc.fileName, format]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download file
  const handleDownload = () => {
    downloadJsonFile(jsonText, targetFileName, minified);
  };

  // Handle file drop / upload to convert
  const handleProcessFile = async (file: File) => {
    if (!/\.(kmz|kml)$/i.test(file.name)) {
      setConvertError('Por favor selecione um arquivo válido .kmz ou .kml');
      return;
    }

    try {
      setIsConvertingFile(true);
      setConvertError(null);
      setUploadedFile(file);

      const result = await convertKmzFileToJson(file, format);
      setConvertedDoc(result.doc);
      setActiveTab('convert_new');
      setIsConvertingFile(false);
    } catch (err: any) {
      setIsConvertingFile(false);
      setConvertError(err.message || 'Falha ao converter arquivo KMZ/KML.');
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <FileJson className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">Converter KMZ / KML para JSON</span>
                <span className="text-[9px] sm:text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded font-semibold uppercase shrink-0">
                  GeoJSON &amp; JSON
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                Exporte geometrias, coordenadas, rotas e metadados em padrão JSON universal
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

        {/* Source Mode Tabs */}
        <div className="bg-slate-100 px-3 sm:px-5 pt-2 border-b border-slate-200 flex gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px] ${
              activeTab === 'current'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">Arquivo Ativo ({kmlDoc.fileName})</span>
          </button>

          <button
            onClick={() => setActiveTab('convert_new')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px] ${
              activeTab === 'convert_new'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Converter Outro KMZ/KML...</span>
          </button>
        </div>

        {/* Controls and Options Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Format selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Formato:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => setFormat('geojson')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                  format === 'geojson'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Padrão universal RFC 7946 (QGIS, ArcGIS, Leaflet, Mapbox, PostGIS)"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>GeoJSON</span>
              </button>

              <button
                onClick={() => setFormat('structured')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                  format === 'structured'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="JSON estruturado com metadados, contadores e lista de localidades"
              >
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>JSON Estruturado</span>
              </button>
            </div>

            {/* Scope (All vs Filtered) */}
            {activeTab === 'current' && (
              <div className="flex items-center gap-1.5 sm:ml-2 sm:pl-3 sm:border-l sm:border-slate-300 text-xs">
                <span className="font-semibold text-slate-600">Escopo:</span>
                <button
                  onClick={() => setScope('all')}
                  className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer min-h-[32px] ${
                    scope === 'all'
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas ({kmlDoc.placemarks.length})
                </button>
                <button
                  onClick={() => setScope('filtered')}
                  className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer min-h-[32px] ${
                    scope === 'filtered'
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Filtradas ({filteredPlacemarks.length})
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Copy & Download */}
          <div className="flex items-center gap-2 justify-end">
            {/* Minify toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none mr-2">
              <input
                type="checkbox"
                checked={minified}
                onChange={(e) => setMinified(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Minificar</span>
            </label>

            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 active:bg-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs min-h-[38px]"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Baixar</span>
            </button>
          </div>
        </div>

        {/* Modal Main Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* If Tab is "convert_new" and no file converted yet, show dropzone */}
          {activeTab === 'convert_new' && (
            <div className="md:w-80 bg-slate-50 p-4 border-r border-slate-200 flex flex-col shrink-0">
              <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Converter Novo Arquivo</span>
              </h3>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                {isConvertingFile ? (
                  <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Lendo e convertendo KMZ...</span>
                  </div>
                ) : (
                  <>
                    <FileJson className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-xs font-bold text-slate-700 mb-1">
                      Arraste seu arquivo .kmz ou .kml aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Ou escolha do seu computador
                    </p>
                    <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                      Selecionar Arquivo
                      <input
                        type="file"
                        accept=".kmz,.kml"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>

              {convertError && (
                <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {convertError}
                </div>
              )}

              {convertedDoc && uploadedFile && (
                <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="truncate">{uploadedFile.name}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {convertedDoc.placemarks.length} localidades convertidas com sucesso!
                  </div>
                  {onLoadFileToMap && (
                    <button
                      onClick={() => onLoadFileToMap(uploadedFile)}
                      className="w-full mt-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Visualizar também no Mapa</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right/Main Area: Interactive JSON Code Preview & Info */}
          <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
            {/* Meta bar */}
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-cyan-400 font-semibold">{targetFileName}</span>
                <span>•</span>
                <span>{activePlacemarks.length} localidades</span>
                <span>•</span>
                <span>{fileSizeInfo}</span>
                <span>•</span>
                <span>{lineCount.toLocaleString('pt-BR')} linhas</span>
              </div>

              <div className="text-[11px] text-slate-500">
                {format === 'geojson'
                  ? 'FeatureCollection GeoJSON (WGS84)'
                  : 'JSON Estruturado com Coordenadas'}
              </div>
            </div>

            {/* Code editor container */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text bg-[#0d1117]">
              <pre className="text-slate-300">
                <code>{jsonText}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3.5 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs text-slate-600 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              {format === 'geojson'
                ? 'O GeoJSON gerado é 100% compatível com QGIS, ArcGIS, Leaflet, Mapbox e PostGIS.'
                : 'O JSON estruturado inclui links diretos para o Google Maps e WhatsApp.'}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold cursor-pointer min-h-[38px]"
            >
              Fechar
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
