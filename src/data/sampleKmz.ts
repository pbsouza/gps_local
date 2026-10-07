import { KmlDocument } from '../types/kml';

export interface SampleDataset {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  count: number;
}

export const SAMPLE_DATASETS: SampleDataset[] = [];

export function getSampleDataset(_id?: string): KmlDocument {
  return getEmptyDataset();
}

export function getEmptyDataset(): KmlDocument {
  return {
    fileName: 'mapa_em_branco.kmz',
    fileSize: 0,
    title: 'Dispositivos & GPS',
    description: 'Rastreador GPS e Localizador de Dispositivos por Satélite',
    placemarks: [],
    categories: [],
    assetUrls: {},
  };
}

export { getEmptyDataset as getPioIxDataset };
