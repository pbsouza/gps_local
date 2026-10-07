export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiGeometry' | 'Unknown';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlacemarkFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  folderName?: string;
  styleUrl?: string;
  iconUrl?: string;
  geometryType: GeometryType;
  point?: LatLng;
  lineCoordinates?: LatLng[];
  polygonCoordinates?: LatLng[][];
  extendedData?: Record<string, string>;
  snippet?: string;
}

export interface CategoryInfo {
  name: string;
  count: number;
  color: string;
  visible: boolean;
}

export interface KmlDocument {
  fileName: string;
  fileSize?: number;
  title: string;
  description?: string;
  placemarks: PlacemarkFeature[];
  categories: CategoryInfo[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  assetUrls: Record<string, string>;
}

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';

export interface RouteOrigin {
  type: 'current_location' | 'custom_point' | 'placemark';
  label: string;
  coordinates: LatLng;
  placemarkId?: string;
}

export interface RouteDestination {
  label: string;
  coordinates: LatLng;
  placemarkId?: string;
}

export interface RouteStep {
  instruction: string;
  distanceText?: string;
  durationText?: string;
  highway?: string;
  modifier?: string;
  type?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  maneuverLocation?: LatLng;
}

export interface RouteAlternative {
  id: string;
  title: string;
  summary: string;
  highways: string[];
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  coordinates: [number, number][];
  steps: RouteStep[];
}

export interface RouteResultDetails {
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  summary?: string;
  highways?: string[];
  steps: RouteStep[];
  alternatives?: RouteAlternative[];
  selectedAlternativeIndex?: number;
}

export interface LiveNavigationState {
  isActive: boolean;
  currentLocation: LatLng | null;
  heading: number | null;
  speedKmh: number | null;
  altitude: number | null;
  accuracy: number | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  nextStep: RouteStep | null;
}
