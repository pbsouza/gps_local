import { KmlDocument } from '../types/kml';

export function getPioIxDataset(): KmlDocument {
  return {
    fileName: 'dispositivos.kmz',
    fileSize: 0,
    title: 'Dispositivos & GPS',
    description: 'Rastreador GPS e Localizador por Satélite',
    placemarks: [],
    categories: [],
    assetUrls: {},
  };
}
