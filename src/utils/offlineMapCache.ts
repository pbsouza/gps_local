// Utility to calculate and pre-cache map tiles for offline usage

export interface TileCoord {
  x: number;
  y: number;
  z: number;
  url: string;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Default bounding box for regional offline map cache
export const DEFAULT_OFFLINE_BOUNDS: BoundingBox = {
  north: -14.0,
  south: -24.0,
  west: -52.0,
  east: -40.0,
};

export const PIO_IX_BOUNDS = DEFAULT_OFFLINE_BOUNDS;

// Convert Lat/Lng to Slippy Map Tile numbers
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

// Generate list of tile URLs for a given bounding box and zoom range
export function getTilesForBounds(
  bounds: BoundingBox = PIO_IX_BOUNDS,
  minZoom = 11,
  maxZoom = 14,
  subdomain = 'a'
): TileCoord[] {
  const tiles: TileCoord[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const topLeft = latLngToTile(bounds.north, bounds.west, z);
    const bottomRight = latLngToTile(bounds.south, bounds.east, z);

    const minX = Math.min(topLeft.x, bottomRight.x);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxY = Math.max(topLeft.y, bottomRight.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // OpenStreetMap standard tile URL pattern
        const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        tiles.push({ x, y, z, url });
      }
    }
  }

  return tiles;
}

// Download and cache tiles into the CacheStorage API
export async function downloadAndCacheTiles(
  tiles: TileCoord[],
  cacheName = 'osm-tiles-cache',
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; cachedCount: number; errors: number }> {
  if (!('caches' in window)) {
    throw new Error('CacheStorage API não é suportada neste navegador.');
  }

  const cache = await caches.open(cacheName);
  let cachedCount = 0;
  let errors = 0;

  // Process in small batches of 4 parallel requests to prevent network congestion
  const BATCH_SIZE = 4;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (tile) => {
        try {
          // Check if already in cache
          const existing = await cache.match(tile.url);
          if (existing) {
            cachedCount++;
            return;
          }

          // Fetch with no-cors or standard CORS
          const res = await fetch(tile.url, { mode: 'no-cors' });
          if (res) {
            await cache.put(tile.url, res);
            cachedCount++;
          }
        } catch (err) {
          errors++;
          console.warn(`Erro ao baixar bloco do mapa ${tile.url}:`, err);
        }
      })
    );

    if (onProgress) {
      onProgress(Math.min(i + batch.length, tiles.length), tiles.length);
    }
  }

  return { success: true, cachedCount, errors };
}

// Get statistics on cached map tiles
export async function getOfflineMapStats(cacheName = 'osm-tiles-cache'): Promise<{ count: number }> {
  if (!('caches' in window)) {
    return { count: 0 };
  }

  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    return { count: keys.length };
  } catch {
    return { count: 0 };
  }
}

// Clear offline map cache
export async function clearOfflineMapCache(cacheName = 'osm-tiles-cache'): Promise<boolean> {
  if (!('caches' in window)) return false;
  try {
    return await caches.delete(cacheName);
  } catch {
    return false;
  }
}
