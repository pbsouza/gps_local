import { LatLng, TravelMode, RouteStep, RouteAlternative } from '../types/kml';

// Calculate initial azimuth / bearing between two geographic points
export function calculateBearing(start: LatLng, end: LatLng): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

// Convert bearing in degrees to 16-wind compass direction name
export function bearingToCompassDirection(bearing: number): string {
  const directions = [
    'Norte (N)',
    'Norte-Nordeste (NNE)',
    'Nordeste (NE)',
    'Leste-Nordeste (ENE)',
    'Leste (L)',
    'Leste-Sudeste (ESE)',
    'Sudeste (SE)',
    'Sul-Sudeste (SSE)',
    'Sul (S)',
    'Sul-Sudoeste (SSO)',
    'Sudoeste (SO)',
    'Oeste-Sudoeste (OSO)',
    'Oeste (O)',
    'Oeste-Noroeste (ONO)',
    'Noroeste (NO)',
    'Norte-Noroeste (NNO)',
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

// Haversine distance in meters
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}

// Format meters into clean km or m
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

// Format seconds into clean h and min
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} min`;
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

// Extract highway label from step data (ref, name, destinations)
export function getHighwayLabel(s: any): string {
  const ref = s.ref ? s.ref.trim() : '';
  const name = s.name ? s.name.trim() : '';
  const destinations = s.destinations ? s.destinations.trim() : '';

  if (ref && name && ref !== name) {
    return `${ref} (${name})`;
  }
  if (ref) return ref;
  if (name) return name;
  if (destinations) return `sentido ${destinations}`;
  return '';
}

// Extract unique list of highway codes (e.g. BR-101, BR-116, BR-407, PI-144, PI-375)
export function extractHighwaysFromSteps(steps: any[]): string[] {
  const highwaysSet = new Set<string>();

  steps.forEach((s) => {
    const text = `${s.ref || ''} ${s.name || ''}`;
    // Match common Brazilian federal and state highway patterns: BR-116, PI-144, BA-052, CE-060, PE-160, etc.
    const matches = text.match(/\b(BR|PI|BA|PE|CE|MG|ES|PB|RN|MA|TO|GO|SP|RJ|PR|SC|RS|MS|MT|DF|AL|SE|PA|RO|AC|AM|RR|AP)[- ]?\d{1,3}[A-Z]?\b/gi);
    if (matches) {
      matches.forEach((m) => {
        const normalized = m.toUpperCase().replace(/\s+/, '-');
        highwaysSet.add(normalized);
      });
    } else if (s.ref && s.ref.trim().length <= 10) {
      highwaysSet.add(s.ref.trim().toUpperCase());
    } else if (s.name && /rodovia|estrada/i.test(s.name) && s.name.length < 35) {
      highwaysSet.add(s.name.trim());
    }
  });

  return Array.from(highwaysSet);
}

// Build human summary from highway list (e.g. "via BR-116 e BR-407")
export function buildHighwaySummary(highways: string[]): string {
  if (highways.length === 0) return 'via Principais Rodovias';
  if (highways.length === 1) return `via ${highways[0]}`;
  if (highways.length === 2) return `via ${highways[0]} e ${highways[1]}`;
  return `via ${highways.slice(0, -1).join(', ')} e ${highways[highways.length - 1]}`;
}

// Translate OSRM maneuvers into rich Portuguese instructions with highway tags
export function parseOsrmSteps(
  osrmSteps: any[],
  originLabel: string,
  destinationLabel: string
): RouteStep[] {
  if (!osrmSteps || osrmSteps.length === 0) return [];

  return osrmSteps.map((s, index) => {
    const maneuver = s.maneuver || {};
    const type = maneuver.type;
    const modifier = maneuver.modifier;
    const highway = getHighwayLabel(s);
    const street = highway ? `na <b>${highway}</b>` : '';

    let instruction = '';

    if (index === 0) {
      instruction = `Partir de <b>${originLabel}</b> ${street ? `acessando <b>${highway}</b>` : 'pela via principal'}`;
    } else if (index === osrmSteps.length - 1 || type === 'arrive') {
      instruction = `Chegada ao destino final: <b>${destinationLabel}</b>`;
    } else {
      switch (type) {
        case 'turn':
          if (modifier === 'right') instruction = `Vire à direita ${street}`;
          else if (modifier === 'left') instruction = `Vire à esquerda ${street}`;
          else if (modifier === 'slight right') instruction = `Curva suave à direita ${street}`;
          else if (modifier === 'slight left') instruction = `Curva suave à esquerda ${street}`;
          else if (modifier === 'sharp right') instruction = `Curva acentuada à direita ${street}`;
          else if (modifier === 'sharp left') instruction = `Curva acentuada à esquerda ${street}`;
          else instruction = `Faça a conversão ${street}`;
          break;
        case 'new name':
          instruction = `A via passa a se chamar <b>${highway}</b>`;
          break;
        case 'continue':
          instruction = `Continue em frente ${street}`;
          break;
        case 'roundabout':
        case 'rotary':
          instruction = `Entre na rotatória e pegue a saída ${street}`;
          break;
        case 'fork':
          instruction = `Na bifurcação, mantenha-se à ${modifier === 'right' ? 'direita' : 'esquerda'} ${street}`;
          break;
        case 'end of road':
          instruction = `No final da via, vire à ${modifier === 'right' ? 'direita' : 'esquerda'} ${street}`;
          break;
        case 'on ramp':
        case 'merge':
          instruction = `Acesse o acesso / pista principal ${street}`;
          break;
        case 'off ramp':
          instruction = `Pegue a alça de saída para <b>${highway}</b>`;
          break;
        default:
          instruction = highway ? `Siga pela rodovia <b>${highway}</b>` : `Continue pelo trajeto`;
          break;
      }
    }

    const maneuverLocation: LatLng | undefined =
      maneuver.location && Array.isArray(maneuver.location) && maneuver.location.length >= 2
        ? { lat: maneuver.location[1], lng: maneuver.location[0] }
        : undefined;

    return {
      instruction,
      distanceText: formatDistance(s.distance || 0),
      durationText: formatDuration(s.duration || 0),
      highway: s.ref || s.name || undefined,
      modifier,
      type,
      distanceMeters: s.distance || 0,
      durationSeconds: s.duration || 0,
      maneuverLocation,
    };
  });
}

// Find closest upcoming step for real-time live navigation HUD
export function findUpcomingManeuver(
  currentPos: LatLng,
  steps: RouteStep[]
): { step: RouteStep; stepIndex: number; distanceToManeuverMeters: number } | null {
  if (!steps || steps.length === 0) return null;

  // Look for the next step ahead that has maneuver location
  let closestStep: RouteStep | null = null;
  let closestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (st.maneuverLocation) {
      const d = haversineDistance(currentPos, st.maneuverLocation);
      // We consider maneuvers within 15 meters to already be happening or passed
      if (d > 15 && d < minDistance) {
        minDistance = d;
        closestStep = st;
        closestIdx = i;
      }
    }
  }

  if (closestStep) {
    return {
      step: closestStep,
      stepIndex: closestIdx,
      distanceToManeuverMeters: minDistance,
    };
  }

  // Fallback to second step if available, or first
  const fallbackStep = steps.length > 1 ? steps[1] : steps[0];
  const dist = fallbackStep.maneuverLocation
    ? haversineDistance(currentPos, fallbackStep.maneuverLocation)
    : 0;

  return {
    step: fallbackStep,
    stepIndex: 1,
    distanceToManeuverMeters: dist,
  };
}

// Infer probable highway corridor based on geographic origin/destination when offline
export function inferOfflineHighways(origin: LatLng, destination: LatLng): { highways: string[]; summary: string } {
  // Region of Pio IX is approximately Lat -6.84, Lng -40.58
  const pioIxLat = -6.84;
  const pioIxLng = -40.58;

  // Origin is South / Southeast of Pio IX (ES, RJ, MG, SP)
  if (origin.lat < -14) {
    const highways = ['BR-101', 'BR-116', 'BR-407', 'PI-144'];
    return {
      highways,
      summary: 'via Rodovias Federais BR-116, BR-407 e PI-144',
    };
  }

  // Origin is West (Brasília, GO, TO, Barreiras)
  if (origin.lng < -44) {
    const highways = ['BR-020', 'BR-242', 'BR-407', 'PI-144'];
    return {
      highways,
      summary: 'via BR-020, BR-242 e BR-407',
    };
  }

  // Origin is North (Fortaleza, Ceará, Sobral)
  if (origin.lat > -5) {
    const highways = ['BR-020', 'BR-116', 'BR-230', 'PI-144'];
    return {
      highways,
      summary: 'via BR-020, BR-230 e PI-144',
    };
  }

  // Origin is East (Recife, Pernambuco, Caruaru, Araripina)
  if (origin.lng > -39) {
    const highways = ['BR-232', 'BR-316', 'PI-144'];
    return {
      highways,
      summary: 'via BR-232, BR-316 e PI-144',
    };
  }

  // Local region within Piauí (Teresina, Picos, Fronteiras)
  const highways = ['BR-316', 'PI-144', 'PI-375'];
  return {
    highways,
    summary: 'via BR-316 e Rodovia Estadual PI-144',
  };
}

// Generate rich, structured turn-by-turn guidance when offline with highway names
export function generateOfflineSteps(
  origin: LatLng,
  originLabel: string,
  destination: LatLng,
  destinationLabel: string,
  travelMode: TravelMode,
  totalDistanceMeters: number,
  totalDurationSeconds: number
): RouteStep[] {
  const bearing = calculateBearing(origin, destination);
  const compass = bearingToCompassDirection(bearing);
  const corridor = inferOfflineHighways(origin, destination);

  const modeDescriptions: Record<TravelMode, string> = {
    DRIVING: 'condução de veículo (automóvel / caminhonete)',
    WALKING: 'caminhada a pé',
    BICYCLING: 'trajeto de bicicleta',
    TRANSIT: 'transporte rodoviário / ônibus',
  };

  const steps: RouteStep[] = [];

  // Step 1: Partida
  steps.push({
    instruction: `Partida de <b>${originLabel}</b> (${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)})`,
    distanceText: 'Ponto de partida',
    durationText: '0 min',
  });

  // Step 2: Rumo inicial e acesso à primeira rodovia
  const mainHighway = corridor.highways[0] || 'rodovia principal';
  const firstQuarterDist = totalDistanceMeters * 0.25;
  const firstQuarterTime = totalDurationSeconds * 0.25;
  steps.push({
    instruction: `Acessar o corredor da <b>${mainHighway}</b> com <b>rumo ${compass}</b> (${bearing}°) em modo de ${modeDescriptions[travelMode]}`,
    distanceText: formatDistance(firstQuarterDist),
    durationText: formatDuration(firstQuarterTime),
    highway: mainHighway,
  });

  // Step 3: Conexão rodoviária intermediária
  const midHighway = corridor.highways[1] || 'BR-407';
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const halfDist = totalDistanceMeters * 0.5;
  const halfTime = totalDurationSeconds * 0.5;
  steps.push({
    instruction: `Seguir pelo tronco rodoviário da <b>${midHighway}</b> passando pelo ponto de referência regional (${midLat.toFixed(4)}, ${midLng.toFixed(4)})`,
    distanceText: formatDistance(halfDist),
    durationText: formatDuration(halfTime),
    highway: midHighway,
  });

  // Step 4: Acesso ao Piauí e aproximação final
  const localHighway = corridor.highways[corridor.highways.length - 1] || 'PI-144';
  const remainingDist = totalDistanceMeters * 0.25;
  const remainingTime = totalDurationSeconds * 0.25;
  steps.push({
    instruction: `Acessar a rodovia / via principal <b>${localHighway}</b> em direção a <b>${destinationLabel}</b>`,
    distanceText: formatDistance(remainingDist),
    durationText: formatDuration(remainingTime),
    highway: localHighway,
  });

  // Step 5: Chegada ao destino
  steps.push({
    instruction: `Chegada ao destino final: <b>${destinationLabel}</b> (${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)})`,
    distanceText: formatDistance(totalDistanceMeters),
    durationText: formatDuration(totalDurationSeconds),
  });

  return steps;
}

// Generate structured alternative routes for offline navigation
export function generateOfflineAlternatives(
  origin: LatLng,
  originLabel: string,
  destination: LatLng,
  destinationLabel: string,
  travelMode: TravelMode,
  baseDistanceMeters: number,
  baseDurationSeconds: number
): RouteAlternative[] {
  const corridor = inferOfflineHighways(origin, destination);
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  // Primary Route via main highway corridor
  const primarySteps = generateOfflineSteps(
    origin,
    originLabel,
    destination,
    destinationLabel,
    travelMode,
    baseDistanceMeters,
    baseDurationSeconds
  );

  // Intermediate curved waypoints along the highway corridor
  const primaryCoords: [number, number][] = [
    [origin.lat, origin.lng],
    [midLat + 0.04, midLng - 0.03],
    [destination.lat, destination.lng],
  ];

  const primaryAlt: RouteAlternative = {
    id: 'offline-alt-main',
    title: `Mais Rápido (${corridor.highways.slice(0, 2).join(' / ') || 'Rodovias'})`,
    summary: corridor.summary,
    highways: corridor.highways,
    distanceMeters: baseDistanceMeters,
    durationMillis: baseDurationSeconds * 1000,
    distanceText: formatDistance(baseDistanceMeters),
    durationText: formatDuration(baseDurationSeconds),
    coordinates: primaryCoords,
    steps: primarySteps,
  };

  // Secondary Direct / Vicinal Route (slightly different distance/time)
  const secondaryDistance = Math.round(baseDistanceMeters * 1.08);
  const secondaryDuration = Math.round(baseDurationSeconds * 1.15);
  const secondaryHighways = corridor.highways.length > 2
    ? [corridor.highways[0], 'Estrada Vicinal / Ligação']
    : ['Estradas Municipais', 'PI-144'];

  const secondarySteps: RouteStep[] = [
    {
      instruction: `Partir de <b>${originLabel}</b> acessando vias municipais e vicinais`,
      distanceText: formatDistance(secondaryDistance * 0.3),
      durationText: formatDuration(secondaryDuration * 0.3),
    },
    {
      instruction: `Seguir pelo ramal secundário e via de acesso em direção a <b>${destinationLabel}</b>`,
      distanceText: formatDistance(secondaryDistance * 0.4),
      durationText: formatDuration(secondaryDuration * 0.4),
      highway: secondaryHighways[0],
    },
    {
      instruction: `Convergência final para <b>${destinationLabel}</b>`,
      distanceText: formatDistance(secondaryDistance * 0.3),
      durationText: formatDuration(secondaryDuration * 0.3),
      highway: secondaryHighways[1] || undefined,
    },
  ];

  const secondaryCoords: [number, number][] = [
    [origin.lat, origin.lng],
    [midLat - 0.05, midLng + 0.04],
    [destination.lat, destination.lng],
  ];

  const secondaryAlt: RouteAlternative = {
    id: 'offline-alt-secondary',
    title: `Alternativa Vicinal (${formatDistance(secondaryDistance)})`,
    summary: 'via Estradas Vicinais e ramais de ligação',
    highways: secondaryHighways,
    distanceMeters: secondaryDistance,
    durationMillis: secondaryDuration * 1000,
    distanceText: formatDistance(secondaryDistance),
    durationText: formatDuration(secondaryDuration),
    coordinates: secondaryCoords,
    steps: secondarySteps,
  };

  return [primaryAlt, secondaryAlt];
}
