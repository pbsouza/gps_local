export type DeviceType = 'smartphone' | 'vehicle' | 'beacon' | 'pet' | 'cargo';

export interface DevicePositionHistoryPoint {
  lat: number;
  lng: number;
  altitude?: number | null;
  speedKmh?: number | null;
  timestamp: number;
}

export interface TrackedSatelliteDevice {
  id: string; // e.g. "SAT-8421"
  name: string; // e.g. "Celular do João", "Rastreador Hilux"
  type: DeviceType;
  lat: number;
  lng: number;
  altitude: number | null; // meters
  speedKmh: number | null; // km/h
  heading: number | null; // 0 - 360 degrees
  accuracy: number | null; // meters
  battery: number | null; // 0 - 100%
  satellites: number; // locked satellites count (e.g. 14)
  constellation: string; // e.g. "GNSS Multi-Banda (GPS/Galileo)"
  signalQuality: 'excelente' | 'bom' | 'moderado' | 'fraco' | 'desconectado';
  status: 'online' | 'offline' | 'standby';
  lastSeen: number; // epoch ms
  color: string;
  isSimulated?: boolean;
  history: DevicePositionHistoryPoint[];
}

export interface SatelliteTransmitterSettings {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  isTransmitting: boolean;
  transmitIntervalSec: number;
  color: string;
}

export interface TargetProximityInfo {
  distanceMeters: number;
  distanceFormatted: string;
  bearingDegrees: number;
  compassDirection: string;
  relativeBearing: number; // relative to user heading
}
