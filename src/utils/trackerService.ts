import { TrackedSatelliteDevice, TargetProximityInfo, DeviceType } from '../types/tracker';
import { LatLng } from '../types/kml';

const MY_DEVICE_KEY = 'gps_rede_my_device_v1';
const SAVED_DEVICES_KEY = 'gps_rede_saved_devices_v1';

// Generate a random satellite communicator ID (e.g., SAT-4892)
export function generateSatelliteId(): string {
  const letters = 'SAT';
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${letters}-${digits}`;
}

export function normalizeDeviceId(id: string): string {
  return id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

// Color palette for tracked devices
export const DEVICE_COLORS = [
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#3b82f6', // blue
];

export function getDeviceTypeIconName(type: DeviceType): string {
  switch (type) {
    case 'smartphone': return 'Smartphone';
    case 'vehicle': return 'Car';
    case 'beacon': return 'Radio';
    case 'pet': return 'Dog';
    case 'cargo': return 'Package';
    default: return 'Radio';
  }
}

export function getSavedMyDeviceInfo(): {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  color: string;
} {
  try {
    const raw = localStorage.getItem(MY_DEVICE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.deviceId) return parsed;
    }
  } catch (err) {
    console.warn('Error reading saved my device info', err);
  }
  const defaultInfo = {
    deviceId: generateSatelliteId(),
    deviceName: 'Meu Smartphone GPS',
    deviceType: 'smartphone' as DeviceType,
    color: '#06b6d4',
  };
  saveMyDeviceInfo(defaultInfo);
  return defaultInfo;
}

export function saveMyDeviceInfo(info: {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  color: string;
}) {
  try {
    localStorage.setItem(MY_DEVICE_KEY, JSON.stringify(info));
  } catch (err) {
    console.warn('Error saving my device info', err);
  }
}

export function getSavedTargetDeviceIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_DEVICES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.warn('Error reading saved target devices', err);
  }
  return [];
}

export function saveTargetDeviceId(deviceId: string) {
  try {
    const list = getSavedTargetDeviceIds();
    const normalized = normalizeDeviceId(deviceId);
    if (!list.includes(normalized)) {
      list.push(normalized);
      localStorage.setItem(SAVED_DEVICES_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Error saving target device id', err);
  }
}

export function removeSavedTargetDeviceId(deviceId: string) {
  try {
    const list = getSavedTargetDeviceIds().filter(id => id !== normalizeDeviceId(deviceId));
    localStorage.setItem(SAVED_DEVICES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Error removing target device id', err);
  }
}

// Distance calculation in meters (Haversine)
export function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bearing in degrees (0 - 360) from p1 to p2
export function calculateBearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Cardinal direction string
export function bearingToCardinal(bearing: number): string {
  const directions = [
    'Norte (N)',
    'Nordeste (NNE)',
    'Nordeste (NE)',
    'Leste (ENE)',
    'Leste (E)',
    'Sudeste (ESE)',
    'Sudeste (SE)',
    'Sul (SSE)',
    'Sul (S)',
    'Sudoeste (SSO)',
    'Sudoeste (SO)',
    'Oeste (OSO)',
    'Oeste (O)',
    'Noroeste (ONO)',
    'Noroeste (NO)',
    'Norte (NNO)',
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

export function formatDistanceString(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function getProximityInfo(
  userPos: LatLng | null,
  targetPos: LatLng | null,
  userHeading: number | null = 0
): TargetProximityInfo | null {
  if (!userPos || !targetPos) return null;
  const dist = calculateDistanceMeters(userPos, targetPos);
  const bearing = calculateBearingDegrees(userPos, targetPos);
  const compass = bearingToCardinal(bearing);
  const heading = userHeading ?? 0;
  const relative = (bearing - heading + 360) % 360;

  return {
    distanceMeters: dist,
    distanceFormatted: formatDistanceString(dist),
    bearingDegrees: Math.round(bearing),
    compassDirection: compass,
    relativeBearing: Math.round(relative),
  };
}

// Web Audio API proximity radar sound synthesizer (subtle high-tech beep)
let audioCtx: AudioContext | null = null;
export function playRadarPingSound(frequency = 880, durationMs = 120) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.3, audioCtx.currentTime + durationMs / 1000);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (err) {
    // Ignore audio permission/context errors
  }
}

// API client to broadcast location
export async function sendDeviceTelemetry(device: Partial<TrackedSatelliteDevice>): Promise<boolean> {
  try {
    const res = await fetch('/api/tracker/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    return res.ok;
  } catch (err) {
    console.warn('Error sending device telemetry to server:', err);
    return false;
  }
}

// API client to fetch a single device
export async function fetchDeviceTelemetry(deviceId: string): Promise<TrackedSatelliteDevice | null> {
  try {
    const normalized = normalizeDeviceId(deviceId);
    const res = await fetch(`/api/tracker/${encodeURIComponent(normalized)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.device || null;
  } catch (err) {
    console.warn(`Error fetching telemetry for ${deviceId}:`, err);
    return null;
  }
}

// API client to list active devices
export async function fetchActiveDevicesList(): Promise<TrackedSatelliteDevice[]> {
  try {
    const res = await fetch('/api/tracker');
    if (!res.ok) return [];
    const json = await res.json();
    return json.devices || [];
  } catch (err) {
    console.warn('Error fetching active devices list:', err);
    return [];
  }
}
