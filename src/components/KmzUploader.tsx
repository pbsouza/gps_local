import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileCode, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleKmz';

interface KmzUploaderProps {
  currentFileName: string;
  placemarkCount: number;
  isLoading: boolean;
  uploadError?: string | null;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleId: string) => void;
  onClearError?: () => void;
}

export function KmzUploader({
  currentFileName,
  placemarkCount,
  isLoading,
  uploadError,
  onFileUpload,
  onLoadSample,
  onClearError,
}: KmzUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = uploadError || localError;

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
    setLocalError(null);
    onClearError?.();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    onClearError?.();
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    // Allow kmz, kml, xml, zip or any file
    if (ext && !['kmz', 'kml', 'xml', 'zip'].includes(ext)) {
      setLocalError(`Formato ".${ext}" incomum. Tentando processar mesmo assim como KML/KMZ...`);
    }
    onFileUpload(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Abrir Arquivo KMZ / KML</span>
        </div>

        {currentFileName && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{placemarkCount} locais carregados</span>
          </span>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".kmz,.kml,.xml,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="py-2 flex flex-col items-center">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-2" />
            <span className="text-xs font-medium text-slate-700">
              Descompactando e lendo KMZ...
            </span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-2xs">
              <FileCode className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800 mb-0.5">
              Arraste seu arquivo KMZ ou KML aqui
            </p>
            <p className="text-[11px] text-slate-500">
              ou clique para selecionar do seu dispositivo
            </p>
            <span className="mt-2 text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
              Suporta: .KMZ (com imagens/ícones zips) e .KML
            </span>
          </>
        )}
      </div>

      {displayError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Não foi possível carregar o arquivo:</span>
            <span>{displayError}</span>
          </div>
        </div>
      )}

      {/* Clear/Reset Map Action */}
      <div className="pt-1 space-y-2 border-t border-slate-100">
        <button
          onClick={() => onLoadSample('empty')}
          disabled={isLoading}
          className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-slate-700 cursor-pointer shadow-2xs group"
        >
          <div>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>Limpar Camadas do Mapa</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Remove camadas e foca no rastreador GPS
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-900 shrink-0 ml-2">
            Limpar →
          </span>
        </button>
      </div>
    </div>
  );
}
