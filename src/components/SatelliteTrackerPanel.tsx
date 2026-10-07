import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Radio,
  Navigation,
  Compass,
  Battery,
  BatteryCharging,
  Signal,
  MapPin,
  Route,
  Share2,
  Copy,
  Check,
  Play,
  Square,
  RefreshCw,
  Smartphone,
  Car,
  Package,
  Dog,
  ExternalLink,
  Volume2,
  VolumeX,
  Target,
  Satellite,
  Trash2,
  Plus,
  Crosshair,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  TrackedSatelliteDevice,
  DeviceType,
  TargetProximityInfo,
} from '../types/tracker';
import { LatLng } from '../types/kml';
import {
  getSavedMyDeviceInfo,
  saveMyDeviceInfo,
  getSavedTargetDeviceIds,
  saveTargetDeviceId,
  removeSavedTargetDeviceId,
  normalizeDeviceId,
  generateSatelliteId,
  getProximityInfo,
  playRadarPingSound,
  DEVICE_COLORS,
  formatDistanceString,
} from '../utils/trackerService';

interface SatelliteTrackerPanelProps {
  userLocation: LatLng | null;
  userHeading: number | null;
  activeTrackedDevice: TrackedSatelliteDevice | null;
  allTrackedDevices: TrackedSatelliteDevice[];
  isTransmitting: boolean;
  myDeviceId: string;
  onSelectTrackedDevice: (device: TrackedSatelliteDevice | null) => void;
  onTrackNewId: (id: string, name?: string, type?: DeviceType) => void;
  onToggleTransmission: () => void;
  onUpdateMyDeviceInfo: (info: { deviceId: string; deviceName: string; deviceType: DeviceType; color: string }) => void;
  onNavigateToDevice: (device: TrackedSatelliteDevice) => void;
  onFocusDeviceOnMap: (device: TrackedSatelliteDevice) => void;
  onRequestGps: () => void;
  onSimulateDevice: () => void;
  onRemoveTrackedDevice: (id: string) => void;
}

export function SatelliteTrackerPanel({
  userLocation,
  userHeading,
  activeTrackedDevice,
  allTrackedDevices,
  isTransmitting,
  myDeviceId,
  onSelectTrackedDevice,
  onTrackNewId,
  onToggleTransmission,
  onUpdateMyDeviceInfo,
  onNavigateToDevice,
  onFocusDeviceOnMap,
  onRequestGps,
  onSimulateDevice,
  onRemoveTrackedDevice,
}: SatelliteTrackerPanelProps) {
  const [subTab, setSubTab] = useState<'locate' | 'transmit'>('locate');

  // Input for new device ID to track
  const [targetIdInput, setTargetIdInput] = useState('');
  const [targetNameInput, setTargetNameInput] = useState('');
  const [targetTypeInput, setTargetTypeInput] = useState<DeviceType>('smartphone');
  const [showAddForm, setShowAddForm] = useState(false);

  // My device settings
  const [myInfo, setMyInfo] = useState(() => getSavedMyDeviceInfo());
  const [isEditingMyInfo, setIsEditingMyInfo] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Proximity radar audio toggle
  const [radarSoundEnabled, setRadarSoundEnabled] = useState(false);
  const lastSoundPingTimeRef = useRef<number>(0);

  // Generate QR code for sharing current device ID
  useEffect(() => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?track=${encodeURIComponent(myInfo.deviceId)}`;
    QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR Code generation error', err));
  }, [myInfo.deviceId]);

  // Proximity info calculation
  const proximityInfo: TargetProximityInfo | null = activeTrackedDevice
    ? getProximityInfo(userLocation, { lat: activeTrackedDevice.lat, lng: activeTrackedDevice.lng }, userHeading)
    : null;

  // Radar sound ping when active device is near and sound is enabled
  useEffect(() => {
    if (!radarSoundEnabled || !proximityInfo) return;
    const now = Date.now();
    // Adjust ping interval based on distance: closer = faster beeps
    const intervalMs = Math.max(600, Math.min(3000, proximityInfo.distanceMeters * 3));
    if (now - lastSoundPingTimeRef.current > intervalMs) {
      lastSoundPingTimeRef.current = now;
      const freq = Math.min(1400, Math.max(600, 1500 - proximityInfo.distanceMeters * 0.8));
      playRadarPingSound(freq, 100);
    }
  }, [radarSoundEnabled, proximityInfo]);

  // Handle adding device to track
  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput.trim()) return;
    const cleanId = normalizeDeviceId(targetIdInput);
    onTrackNewId(cleanId, targetNameInput.trim() || undefined, targetTypeInput);
    setTargetIdInput('');
    setTargetNameInput('');
    setShowAddForm(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(myInfo.deviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?track=${encodeURIComponent(myInfo.deviceId)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}${window.location.pathname}?track=${encodeURIComponent(myInfo.deviceId)}`;
    const msg = `Estou transmitindo meu sinal GPS via satélite no GPS Rede!\n\nID do meu aparelho: *${myInfo.deviceId}*\n\nAbra o link para me localizar em tempo real:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSaveMyInfo = () => {
    saveMyDeviceInfo(myInfo);
    onUpdateMyDeviceInfo(myInfo);
    setIsEditingMyInfo(false);
  };

  const handleGenerateNewId = () => {
    const newId = generateSatelliteId();
    setMyInfo((prev) => ({ ...prev, deviceId: newId }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-y-auto">
      {/* Sub tabs: Localizar vs Transmitir */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab('locate')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'locate'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span>Localizar Aparelho</span>
          </button>

          <button
            onClick={() => setSubTab('transmit')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
              subTab === 'transmit'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-300" />
            <span>Meu Transmissor</span>
            {isTransmitting && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2" />
            )}
          </button>
        </div>
      </div>

      {/* CONTENT: LOCALIZAR OUTRO APARELHO */}
      {subTab === 'locate' && (
        <div className="p-3.5 space-y-4 flex-1">
          {/* Quick Header and Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Satellite className="w-4 h-4 text-cyan-400" />
                Rastrear por ID Satélite
              </h2>
              <p className="text-[11px] text-slate-400">
                Localize outro celular ou rastreador usando o código de satélite
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancelar' : 'Novo ID'}</span>
            </button>
          </div>

          {/* Form to add/track device ID */}
          {showAddForm && (
            <form
              onSubmit={handleAddDevice}
              className="p-3 bg-slate-800/90 rounded-xl border border-blue-500/30 space-y-3 animate-in fade-in duration-200"
            >
              <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Cadastrar Aparelho para Localizar
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ID do Aparelho (ou Código de Satélite) *
                </label>
                <input
                  type="text"
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value.toUpperCase())}
                  placeholder="Ex: SAT-4820 ou CARRO-01"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase font-mono tracking-wider"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Insira o ID exibido na tela "Meu Transmissor" do outro aparelho.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome / Apelido
                  </label>
                  <input
                    type="text"
                    value={targetNameInput}
                    onChange={(e) => setTargetNameInput(e.target.value)}
                    placeholder="Ex: Celular do Filho"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tipo do Aparelho
                  </label>
                  <select
                    value={targetTypeInput}
                    onChange={(e) => setTargetTypeInput(e.target.value as DeviceType)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="smartphone">📱 Smartphone</option>
                    <option value="vehicle">🚗 Veículo / Carro</option>
                    <option value="beacon">📡 Baliza / Rastreador</option>
                    <option value="pet">🐾 Coleira Pet</option>
                    <option value="cargo">📦 Carga / Mochila</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Conectar e Rastrear
                </button>
              </div>
            </form>
          )}

          {/* SIMULATION HELPER BANNER */}
          {allTrackedDevices.length === 0 && !showAddForm && (
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/70 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <Satellite className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Nenhum aparelho rastreado ainda</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cadastre o ID do outro aparelho acima ou crie um rastreador de teste para simular o sinal de satélite.
                </p>
              </div>
              <div className="pt-1 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Digitar ID do Aparelho
                </button>
                <button
                  onClick={onSimulateDevice}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simular Aparelho de Teste</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE SELECTED DEVICE HUD */}
          {activeTrackedDevice && (
            <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-cyan-500/40 shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500" />

              {/* Header with Title and Connection Status */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeTrackedDevice.color }}
                    />
                    <h3 className="text-sm font-bold text-white truncate max-w-[180px]">
                      {activeTrackedDevice.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-cyan-300 font-semibold bg-slate-900/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      ID: {activeTrackedDevice.id}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        activeTrackedDevice.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activeTrackedDevice.status === 'online'
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-rose-400'
                        }`}
                      />
                      {activeTrackedDevice.status === 'online' ? 'Sinal Ativo' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRadarSoundEnabled(!radarSoundEnabled)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                      radarSoundEnabled
                        ? 'bg-cyan-600/40 text-cyan-300 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                    title={radarSoundEnabled ? 'Desativar bip do radar' : 'Ativar bip sonoro de aproximação'}
                  >
                    {radarSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onFocusDeviceOnMap(activeTrackedDevice)}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors"
                    title="Centralizar no mapa"
                  >
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* TACTICAL PROXIMITY & COMPASS BEARING */}
              {proximityInfo ? (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Distância em Linha Reta
                    </span>
                    <div className="text-xl font-black text-cyan-300 tracking-tight flex items-baseline gap-1">
                      {proximityInfo.distanceFormatted}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({proximityInfo.distanceMeters.toFixed(0)}m)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="text-amber-400 font-semibold">{proximityInfo.compassDirection}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-400">{proximityInfo.bearingDegrees}°</span>
                    </div>
                  </div>

                  {/* Compass pointer pointing toward target */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className="w-14 h-14 rounded-full border-2 border-cyan-500/40 bg-slate-900 flex items-center justify-center relative shadow-inner"
                      title={`Apontando em ${proximityInfo.bearingDegrees}°`}
                    >
                      <div
                        className="transition-transform duration-500 ease-out flex items-center justify-center"
                        style={{
                          transform: `rotate(${proximityInfo.relativeBearing}deg)`,
                        }}
                      >
                        <Navigation className="w-7 h-7 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                      </div>
                      <span className="absolute -top-1.5 text-[8px] font-bold text-slate-400 bg-slate-950 px-1 rounded">
                        N
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono mt-1">
                      Bússola
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Ative seu GPS para calcular a distância e bússola exata até este aparelho.
                  </span>
                  <button
                    onClick={onRequestGps}
                    className="ml-auto px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold shrink-0"
                  >
                    Ativar GPS
                  </button>
                </div>
              )}

              {/* TELEMETRY GRID: SATELLITES, BATTERY, SPEED, ALTITUDE */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <Satellite className="w-3 h-3 text-cyan-400" />
                    <span>Satélites</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {activeTrackedDevice.satellites ?? 12} GNSS
                  </div>
                  <div className="text-[9px] text-emerald-400 truncate">
                    ±{activeTrackedDevice.accuracy ? `${activeTrackedDevice.accuracy.toFixed(1)}m` : '3m'}
                  </div>
                </div>

                <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span>Bateria</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {activeTrackedDevice.battery !== null ? `${activeTrackedDevice.battery}%` : '85%'}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {activeTrackedDevice.battery && activeTrackedDevice.battery < 20 ? 'Bateria Baixa' : 'Normal'}
                  </div>
                </div>

                <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <Route className="w-3 h-3 text-amber-400" />
                    <span>Velocidade</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {activeTrackedDevice.speedKmh ? `${activeTrackedDevice.speedKmh.toFixed(0)} km/h` : 'Parado'}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Alt: {activeTrackedDevice.altitude ? `${activeTrackedDevice.altitude.toFixed(0)}m` : '--'}
                  </div>
                </div>
              </div>

              {/* ACTION: NAVIGATE TO DEVICE */}
              <button
                onClick={() => onNavigateToDevice(activeTrackedDevice)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Route className="w-4 h-4 text-white" />
                <span>Traçar Rota até este Aparelho</span>
              </button>
            </div>
          )}

          {/* LIST OF SAVED / DETECTED DEVICES */}
          {allTrackedDevices.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Aparelhos Cadastrados ({allTrackedDevices.length})</span>
                <button
                  onClick={onSimulateDevice}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  title="Criar novo rastreador simulado para testar"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Teste</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {allTrackedDevices.map((dev) => {
                  const isSelected = activeTrackedDevice?.id === dev.id;
                  const dist = userLocation
                    ? formatDistanceString(
                        getProximityInfo(userLocation, { lat: dev.lat, lng: dev.lng })?.distanceMeters ?? 0
                      )
                    : null;

                  return (
                    <div
                      key={dev.id}
                      onClick={() => onSelectTrackedDevice(dev)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-500/60 shadow-md'
                          : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: dev.color }}
                        >
                          {dev.type === 'vehicle' && <Car className="w-4 h-4" />}
                          {dev.type === 'smartphone' && <Smartphone className="w-4 h-4" />}
                          {dev.type === 'beacon' && <Radio className="w-4 h-4" />}
                          {dev.type === 'pet' && <Dog className="w-4 h-4" />}
                          {dev.type === 'cargo' && <Package className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{dev.name}</span>
                            {dev.isSimulated && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-normal">
                                Simulado
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-semibold">{dev.id}</span>
                            {dist && <span>• {dist}</span>}
                            <span>• {dev.status === 'online' ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToDevice(dev);
                          }}
                          className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-colors"
                          title="Traçar rota"
                        >
                          <Route className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTrackedDevice(dev.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remover aparelho"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: MEU TRANSMISSOR / COMPARTILHAR ID */}
      {subTab === 'transmit' && (
        <div className="p-3.5 space-y-4 flex-1">
          {/* Transmission Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isTransmitting
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-900/20'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isTransmitting
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <Radio className={`w-5 h-5 ${isTransmitting ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Sinal de Satélite / GPS
                  </div>
                  <div
                    className={`text-sm font-black ${
                      isTransmitting ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {isTransmitting ? 'Transmissão Ativa' : 'Transmissão Desativada'}
                  </div>
                </div>
              </div>

              <button
                onClick={onToggleTransmission}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  isTransmitting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isTransmitting ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Iniciar</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2.5">
              {isTransmitting
                ? 'Seu aparelho está transmitindo suas coordenadas GPS em tempo real. Qualquer pessoa com seu ID pode localizá-lo.'
                : 'Ao iniciar a transmissão, seu celular emitirá sua posição via satélite/GPS para ser encontrado.'}
            </p>
          </div>

          {/* MY DEVICE IDENTIFIER CARD */}
          <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                Meu ID de Comunicação
              </span>
              <button
                onClick={() => setIsEditingMyInfo(!isEditingMyInfo)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {isEditingMyInfo ? 'Concluir' : 'Editar Nome/ID'}
              </button>
            </div>

            {/* Display / Edit ID */}
            {isEditingMyInfo ? (
              <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Nome do seu Aparelho
                  </label>
                  <input
                    type="text"
                    value={myInfo.deviceName}
                    onChange={(e) => setMyInfo({ ...myInfo, deviceName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Código ID Personalizado
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={myInfo.deviceId}
                      onChange={(e) => setMyInfo({ ...myInfo, deviceId: normalizeDeviceId(e.target.value) })}
                      className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateNewId}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                      title="Gerar novo ID aleatório"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gerar</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">
                    Tipo do Dispositivo
                  </label>
                  <select
                    value={myInfo.deviceType}
                    onChange={(e) => setMyInfo({ ...myInfo, deviceType: e.target.value as DeviceType })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  >
                    <option value="smartphone">📱 Smartphone</option>
                    <option value="vehicle">🚗 Veículo / Carro</option>
                    <option value="beacon">📡 Baliza / Rastreador</option>
                    <option value="pet">🐾 Coleira Pet</option>
                    <option value="cargo">📦 Carga / Mochila</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleSaveMyInfo}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Código de Satélite</div>
                  <div className="font-mono text-xl font-black text-cyan-400 tracking-wider">
                    {myInfo.deviceId}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{myInfo.deviceName}</div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold transition-colors border border-slate-700"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                    <span>{copiedId ? 'Copiado!' : 'Copiar ID'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* LIVE GPS TELEMETRY FROM THIS DEVICE */}
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Telemetria do Meu GPS</span>
                <span className="text-emerald-400 font-mono">
                  {userLocation ? 'GPS Fixado' : 'Aguardando GPS'}
                </span>
              </div>
              {userLocation ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                  <div>Lat: {userLocation.lat.toFixed(6)}</div>
                  <div>Lng: {userLocation.lng.toFixed(6)}</div>
                </div>
              ) : (
                <button
                  onClick={onRequestGps}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-semibold"
                >
                  Conectar ao GPS do Navegador
                </button>
              )}
            </div>

            {/* QR CODE & SHARING */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 text-center space-y-2.5">
              <div className="text-xs font-bold text-white">
                Compartilhe com o Outro Aparelho
              </div>
              <p className="text-[11px] text-slate-400">
                Aponte a câmera do outro celular para abrir o rastreador já configurado:
              </p>

              {qrCodeDataUrl && (
                <div className="flex justify-center py-1">
                  <div className="p-2 bg-white rounded-xl shadow-lg inline-block">
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR Code ID ${myInfo.deviceId}`}
                      className="w-36 h-36"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleCopyShareLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Direto'}</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
