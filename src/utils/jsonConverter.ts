import { KmlDocument, PlacemarkFeature, LatLng } from '../types/kml';
import { createWhatsAppUrl } from './pdfGenerator';
import { parseKmzOrKml } from './kmzParser';

export type JsonExportFormat = 'geojson' | 'structured';

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'GeometryCollection';
    coordinates: any;
  } | null;
  properties: {
    id: string;
    name: string;
    category: string;
    categoryColor?: string;
    description?: string;
    folder?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
    whatsAppUrl?: string;
    [key: string]: any;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  name?: string;
  description?: string;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  features: GeoJsonFeature[];
  metadata?: {
    generator: string;
    exportedAt: string;
    sourceFile: string;
    totalFeatures: number;
    categories: string[];
  };
}

export interface StructuredJsonExport {
  format: 'KMZ_KML_JSON_STRUCTURED';
  version: '1.0';
  exportedAt: string;
  sourceDocument: {
    fileName: string;
    title: string;
    description?: string;
    totalPlacemarks: number;
    categories: Array<{ name: string; count: number; color: string }>;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  features: Array<{
    id: string;
    name: string;
    category: string;
    categoryColor: string;
    coordinates: {
      latitude: number;
      longitude: number;
    } | null;
    googleMapsUrl: string | null;
    whatsAppShareUrl: string | null;
    description: string;
    folder?: string;
    geometryType: string;
    lineCoordinates?: LatLng[];
    polygonCoordinates?: LatLng[][];
    extendedData?: Record<string, string>;
  }>;
}

/**
 * Converts a KmlDocument and placemarks list to universal RFC 7946 GeoJSON
 */
export function kmlToGeoJson(
  doc: KmlDocument,
  placemarks: PlacemarkFeature[] = doc.placemarks
): GeoJsonFeatureCollection {
  let minLng = 180;
  let minLat = 90;
  let maxLng = -180;
  let maxLat = -90;
  let hasValidCoords = false;

  const features: GeoJsonFeature[] = placemarks.map((pm) => {
    let geometry: GeoJsonFeature['geometry'] = null;

    if (pm.point) {
      geometry = {
        type: 'Point',
        coordinates: [pm.point.lng, pm.point.lat],
      };

      if (pm.point.lng < minLng) minLng = pm.point.lng;
      if (pm.point.lng > maxLng) maxLng = pm.point.lng;
      if (pm.point.lat < minLat) minLat = pm.point.lat;
      if (pm.point.lat > maxLat) maxLat = pm.point.lat;
      hasValidCoords = true;
    } else if (pm.lineCoordinates && pm.lineCoordinates.length > 0) {
      geometry = {
        type: 'LineString',
        coordinates: pm.lineCoordinates.map((p) => [p.lng, p.lat]),
      };
      pm.lineCoordinates.forEach((p) => {
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        hasValidCoords = true;
      });
    } else if (pm.polygonCoordinates && pm.polygonCoordinates.length > 0) {
      geometry = {
        type: 'Polygon',
        coordinates: pm.polygonCoordinates.map((ring) =>
          ring.map((p) => [p.lng, p.lat])
        ),
      };
      pm.polygonCoordinates.forEach((ring) => {
        ring.forEach((p) => {
          if (p.lng < minLng) minLng = p.lng;
          if (p.lng > maxLng) maxLng = p.lng;
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          hasValidCoords = true;
        });
      });
    }

    const mapsUrl = pm.point
      ? `https://www.google.com/maps/dir/?api=1&destination=${pm.point.lat},${pm.point.lng}`
      : undefined;

    const waUrl = pm.point ? createWhatsAppUrl(pm) : undefined;

    return {
      type: 'Feature',
      id: pm.id,
      geometry,
      properties: {
        id: pm.id,
        name: pm.name,
        category: pm.category,
        categoryColor: pm.categoryColor,
        description: pm.description || '',
        folder: pm.folderName,
        latitude: pm.point?.lat,
        longitude: pm.point?.lng,
        googleMapsUrl: mapsUrl,
        whatsAppUrl: waUrl,
        geometryType: pm.geometryType,
        ...(pm.extendedData || {}),
      },
    };
  });

  const geoJson: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    name: doc.title || doc.fileName.replace(/\.(kmz|kml)$/i, ''),
    description: doc.description,
    features,
    metadata: {
      generator: 'KMZ Viewer & Rotas Maps (AI Studio)',
      exportedAt: new Date().toISOString(),
      sourceFile: doc.fileName,
      totalFeatures: features.length,
      categories: Array.from(new Set(placemarks.map((p) => p.category))),
    },
  };

  if (hasValidCoords) {
    geoJson.bbox = [minLng, minLat, maxLng, maxLat];
  }

  return geoJson;
}

/**
 * Converts a KmlDocument and placemarks to clean, readable structured JSON
 */
export function kmlToStructuredJson(
  doc: KmlDocument,
  placemarks: PlacemarkFeature[] = doc.placemarks
): StructuredJsonExport {
  return {
    format: 'KMZ_KML_JSON_STRUCTURED',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sourceDocument: {
      fileName: doc.fileName,
      title: doc.title || doc.fileName,
      description: doc.description,
      totalPlacemarks: placemarks.length,
      categories: doc.categories.map((c) => ({
        name: c.name,
        count: placemarks.filter((p) => p.category === c.name).length,
        color: c.color,
      })),
      bounds: doc.bounds,
    },
    features: placemarks.map((pm) => ({
      id: pm.id,
      name: pm.name,
      category: pm.category,
      categoryColor: pm.categoryColor,
      coordinates: pm.point
        ? {
            latitude: pm.point.lat,
            longitude: pm.point.lng,
          }
        : null,
      googleMapsUrl: pm.point
        ? `https://www.google.com/maps/dir/?api=1&destination=${pm.point.lat},${pm.point.lng}`
        : null,
      whatsAppShareUrl: pm.point ? createWhatsAppUrl(pm) : null,
      description: pm.description || '',
      folder: pm.folderName,
      geometryType: pm.geometryType,
      lineCoordinates: pm.lineCoordinates,
      polygonCoordinates: pm.polygonCoordinates,
      extendedData: pm.extendedData,
    })),
  };
}

/**
 * Directly parses any KML or KMZ File object into JSON
 */
export async function convertKmzFileToJson(
  file: File,
  format: JsonExportFormat = 'geojson'
): Promise<{ doc: KmlDocument; jsonText: string; fileName: string }> {
  const doc = await parseKmzOrKml(file);
  const baseName = file.name.replace(/\.(kmz|kml)$/i, '');

  if (format === 'geojson') {
    const geoJson = kmlToGeoJson(doc);
    return {
      doc,
      jsonText: JSON.stringify(geoJson, null, 2),
      fileName: `${baseName}.geojson`,
    };
  } else {
    const structured = kmlToStructuredJson(doc);
    return {
      doc,
      jsonText: JSON.stringify(structured, null, 2),
      fileName: `${baseName}.json`,
    };
  }
}

/**
 * Triggers download of JSON / GeoJSON in browser
 */
export function downloadJsonFile(
  data: object | string,
  fileName: string,
  minify = false
): void {
  const content =
    typeof data === 'string'
      ? data
      : JSON.stringify(data, null, minify ? 0 : 2);

  const isGeoJson = fileName.toLowerCase().endsWith('.geojson');
  const mimeType = isGeoJson ? 'application/geo+json' : 'application/json';

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
