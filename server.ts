import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

interface DevicePositionHistoryPoint {
  lat: number;
  lng: number;
  altitude?: number | null;
  speedKmh?: number | null;
  timestamp: number;
}

interface TrackedSatelliteDevice {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  altitude: number | null;
  speedKmh: number | null;
  heading: number | null;
  accuracy: number | null;
  battery: number | null;
  satellites: number;
  constellation: string;
  signalQuality: string;
  status: 'online' | 'offline' | 'standby';
  lastSeen: number;
  color: string;
  isSimulated?: boolean;
  history: DevicePositionHistoryPoint[];
}

// In-memory store for registered devices
const activeDevices = new Map<string, TrackedSatelliteDevice>();

// Active SSE client connections keyed by device ID
const sseSubscribers = new Map<string, Set<express.Response>>();

function notifySseSubscribers(deviceId: string, device: TrackedSatelliteDevice) {
  const subscribers = sseSubscribers.get(deviceId);
  if (subscribers && subscribers.size > 0) {
    const payload = `data: ${JSON.stringify(device)}\n\n`;
    for (const clientRes of subscribers) {
      try {
        clientRes.write(payload);
      } catch {
        subscribers.delete(clientRes);
      }
    }
  }
}

// REST Endpoints for Satellite GPS Device Telemetry
app.post('/api/tracker/update', (req, res) => {
  const data = req.body;
  if (!data || !data.id || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
    return res.status(400).json({ error: 'ID e coordenadas válidas (lat, lng) são obrigatórios' });
  }

  const id = String(data.id).trim().toUpperCase();
  const existing = activeDevices.get(id);

  const history: DevicePositionHistoryPoint[] = existing ? [...existing.history] : [];
  const now = Date.now();

  history.push({
    lat: data.lat,
    lng: data.lng,
    altitude: data.altitude ?? null,
    speedKmh: data.speedKmh ?? null,
    timestamp: now,
  });

  // Limit breadcrumbs history to last 100 points
  if (history.length > 100) {
    history.shift();
  }

  const updatedDevice: TrackedSatelliteDevice = {
    id,
    name: data.name || (existing?.name ?? `Dispositivo ${id}`),
    type: data.type || existing?.type || 'smartphone',
    lat: data.lat,
    lng: data.lng,
    altitude: data.altitude ?? null,
    speedKmh: data.speedKmh ?? null,
    heading: data.heading ?? null,
    accuracy: data.accuracy ?? null,
    battery: data.battery ?? null,
    satellites: data.satellites ?? 14,
    constellation: data.constellation || 'GNSS Multi-Banda (GPS/Galileo)',
    signalQuality: data.signalQuality || 'excelente',
    status: 'online',
    lastSeen: now,
    color: data.color || existing?.color || '#06b6d4',
    isSimulated: !!data.isSimulated,
    history,
  };

  activeDevices.set(id, updatedDevice);
  notifySseSubscribers(id, updatedDevice);

  return res.json({ success: true, device: updatedDevice });
});

app.get('/api/tracker/:id', (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();
  const device = activeDevices.get(id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo satelital não encontrado', id });
  }
  const isOnline = Date.now() - device.lastSeen < 60000;
  return res.json({
    success: true,
    device: {
      ...device,
      status: isOnline ? 'online' : 'offline',
    },
  });
});

app.get('/api/tracker', (_req, res) => {
  const now = Date.now();
  const list = Array.from(activeDevices.values()).map((dev) => ({
    ...dev,
    status: (now - dev.lastSeen < 60000 ? 'online' : 'offline') as 'online' | 'offline',
  }));
  return res.json({ success: true, devices: list });
});

app.delete('/api/tracker/:id', (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();
  const existed = activeDevices.delete(id);
  return res.json({ success: existed });
});

// SSE endpoint for instant streaming
app.get('/api/tracker/stream/:id', (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseSubscribers.has(id)) {
    sseSubscribers.set(id, new Set());
  }
  sseSubscribers.get(id)!.add(res);

  const existing = activeDevices.get(id);
  if (existing) {
    res.write(`data: ${JSON.stringify(existing)}\n\n`);
  }

  req.on('close', () => {
    const subs = sseSubscribers.get(id);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) sseSubscribers.delete(id);
    }
  });
});

async function startServer() {
  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`GPS Rede server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
