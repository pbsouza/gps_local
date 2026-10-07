import JSZip from 'jszip';
import { KmlDocument, PlacemarkFeature, CategoryInfo, LatLng, GeometryType } from '../types/kml';

const PALETTE = [
  '#2563eb', // Blue
  '#16a34a', // Emerald
  '#dc2626', // Red
  '#d97706', // Amber
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#db2777', // Pink
  '#4f46e5', // Indigo
  '#059669', // Teal
  '#65a30d', // Lime
  '#475569', // Slate
];

/**
 * Gets element's local tag name, ignoring XML namespaces (e.g. kml:Placemark -> placemark)
 */
function getLocalName(el: Element): string {
  return (el.localName || el.nodeName.split(':').pop() || el.nodeName).toLowerCase();
}

/**
 * Finds child elements matching local tag name, regardless of namespace prefix
 */
function findChildByLocalName(parent: Element, name: string): Element | null {
  const target = name.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (getLocalName(child) === target) {
      return child;
    }
  }
  return null;
}

/**
 * Finds all descendant elements matching local tag name
 */
function findDescendantsByLocalName(parent: Element | Document, name: string): Element[] {
  const all = parent.getElementsByTagName('*');
  const res: Element[] = [];
  const target = name.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (getLocalName(el) === target) {
      res.push(el);
    }
  }
  return res;
}

/**
 * Parses coordinate string in KML format (lon,lat,alt lon,lat,alt ...)
 * Handles flexible spacing, e.g. "lon, lat, alt" or "lon,lat"
 */
function parseCoordinateTuples(raw: string): LatLng[] {
  const result: LatLng[] = [];
  if (!raw) return result;

  // Clean whitespace around commas: "lon , lat" -> "lon,lat"
  const normalized = raw.replace(/\s*,\s*/g, ',').trim();
  const tokens = normalized.split(/\s+/);

  for (const token of tokens) {
    if (!token.trim()) continue;
    const parts = token.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        result.push({ lat, lng });
      }
    }
  }
  return result;
}

/**
 * Extracts inner text of a tag, handling CDATA and namespaces
 */
function getTagText(element: Element, tagName: string): string {
  const node = findDescendantsByLocalName(element, tagName)[0];
  if (!node) return '';
  return node.textContent?.trim() || '';
}

/**
 * Extracts ExtendedData key-value pairs
 */
function parseExtendedData(placemark: Element): Record<string, string> {
  const data: Record<string, string> = {};
  const extendedData = findDescendantsByLocalName(placemark, 'extendeddata')[0];
  if (!extendedData) return data;

  const dataNodes = findDescendantsByLocalName(extendedData, 'data');
  for (const node of dataNodes) {
    const name = node.getAttribute('name');
    const valNode = findDescendantsByLocalName(node, 'value')[0];
    if (name && valNode) {
      data[name] = valNode.textContent?.trim() || '';
    }
  }

  const simpleDataNodes = findDescendantsByLocalName(extendedData, 'simpledata');
  for (const node of simpleDataNodes) {
    const name = node.getAttribute('name');
    if (name) {
      data[name] = node.textContent?.trim() || '';
    }
  }

  return data;
}

/**
 * Helper to normalize and replace asset references (images/icons) in HTML
 */
function injectAssetUrls(html: string, assetUrls: Record<string, string>): string {
  if (!html || Object.keys(assetUrls).length === 0) return html;

  let processed = html;
  for (const [relativePath, blobUrl] of Object.entries(assetUrls)) {
    const escaped = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(["'])(?:\\.\\/)?${escaped}(["'])`, 'gi');
    processed = processed.replace(pattern, `$1${blobUrl}$2`);
  }
  return processed;
}

/**
 * Sanitizes unescaped ampersands in XML that are not part of valid entities
 */
function sanitizeXmlAmpersands(xml: string): string {
  return xml.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

/**
 * Robust main parser for KMZ and KML files
 */
export async function parseKmzOrKml(file: File): Promise<KmlDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Check magic bytes: PK\x03\x04 indicates a ZIP archive (KMZ)
  const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4b;
  const assetUrls: Record<string, string> = {};
  let kmlText = '';

  if (isZip) {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 1. Extract asset files (images, icons) into Object URLs
      const assetEntries = Object.entries(zip.files).filter(
        ([path, zipEntry]) => !zipEntry.dir && /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(path)
      );

      for (const [path, zipEntry] of assetEntries) {
        const blob = await zipEntry.async('blob');
        const blobUrl = URL.createObjectURL(blob);
        assetUrls[path] = blobUrl;
        const fileName = path.split('/').pop();
        if (fileName && !assetUrls[fileName]) {
          assetUrls[fileName] = blobUrl;
        }
      }

      // 2. Find any .kml file in the zip (case-insensitive)
      const kmlEntryNames = Object.keys(zip.files).filter(
        (p) => !zip.files[p].dir && p.toLowerCase().endsWith('.kml')
      );

      // Prioritize doc.kml if present
      kmlEntryNames.sort((a, b) => {
        if (a.toLowerCase().endsWith('doc.kml')) return -1;
        if (b.toLowerCase().endsWith('doc.kml')) return 1;
        return a.localeCompare(b);
      });

      if (kmlEntryNames.length > 0) {
        kmlText = await zip.files[kmlEntryNames[0]].async('string');
      } else {
        // Fallback: search for any text file containing '<kml'
        for (const p of Object.keys(zip.files)) {
          if (!zip.files[p].dir) {
            const candidate = await zip.files[p].async('string');
            if (candidate.includes('<kml') || candidate.includes('<Placemark')) {
              kmlText = candidate;
              break;
            }
          }
        }
      }

      if (!kmlText) {
        throw new Error('Nenhum arquivo KML válido foi encontrado dentro do arquivo KMZ.');
      }
    } catch (zipErr: any) {
      console.warn('Erro ao descompactar como ZIP, tentando ler como texto puro...', zipErr);
      // Fallback: maybe it is plain text XML despite the PK header
      const decoder = new TextDecoder('utf-8');
      kmlText = decoder.decode(uint8);
    }
  } else {
    // Plain text KML
    const decoder = new TextDecoder('utf-8');
    kmlText = decoder.decode(uint8);
  }

  return parseKmlContent(kmlText, file.name, file.size, assetUrls);
}

/**
 * Parses raw KML text into KmlDocument
 */
export function parseKmlContent(
  kmlText: string,
  fileName = 'arquivo.kml',
  fileSize = 0,
  assetUrls: Record<string, string> = {}
): KmlDocument {
  // Strip UTF-8 BOM
  let cleanKml = kmlText.replace(/^\uFEFF/, '').trim();

  const parser = new DOMParser();
  let xmlDoc = parser.parseFromString(cleanKml, 'text/xml');

  // Check for parse errors - attempt auto-repair for common XML issues like bare ampersands
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    cleanKml = sanitizeXmlAmpersands(cleanKml);
    const repairedDoc = parser.parseFromString(cleanKml, 'text/xml');
    if (repairedDoc.getElementsByTagName('parsererror').length === 0) {
      xmlDoc = repairedDoc;
    } else {
      // Last resort: strip xml declaration or remove problematic tags
      const strippedDecl = cleanKml.replace(/<\?xml[^>]*\?>/gi, '');
      const retryDoc = parser.parseFromString(strippedDecl, 'text/xml');
      if (retryDoc.getElementsByTagName('parsererror').length === 0) {
        xmlDoc = retryDoc;
      } else {
        const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
        throw new Error(`Erro ao interpretar XML: ${parseError.textContent?.slice(0, 140)}`);
      }
    }
  }

  // Extract document title
  const docTitleEl =
    findDescendantsByLocalName(xmlDoc, 'document')[0] ||
    findDescendantsByLocalName(xmlDoc, 'kml')[0] ||
    xmlDoc.documentElement;

  const docTitle =
    findDescendantsByLocalName(docTitleEl, 'name')[0]?.textContent?.trim() ||
    fileName.replace(/\.(kmz|kml)$/i, '');

  const docDesc =
    findDescendantsByLocalName(docTitleEl, 'description')[0]?.textContent?.trim() || '';

  // Parse Styles to map styleUrl -> iconHref
  const styleIconMap: Record<string, string> = {};
  const styleNodes = findDescendantsByLocalName(xmlDoc, 'style');
  for (const s of styleNodes) {
    const id = s.getAttribute('id');
    const href = findDescendantsByLocalName(s, 'href')[0]?.textContent?.trim();
    if (id && href) {
      styleIconMap[`#${id}`] = assetUrls[href] || href;
    }
  }

  const placemarks: PlacemarkFeature[] = [];
  const categoryCounter: Record<string, number> = {};

  // Recursive placemark extractor to maintain folder context
  function processNode(node: Element, currentFolder = '') {
    const localName = getLocalName(node);

    let folderName = currentFolder;
    if (localName === 'folder') {
      const fNameEl = findChildByLocalName(node, 'name');
      if (fNameEl && fNameEl.textContent?.trim()) {
        folderName = fNameEl.textContent.trim();
      }
    }

    if (localName === 'placemark') {
      const name = findChildByLocalName(node, 'name')?.textContent?.trim() || 'Sem nome';
      let rawDescription =
        findChildByLocalName(node, 'description')?.textContent?.trim() || '';
      rawDescription = injectAssetUrls(rawDescription, assetUrls);

      const snippet = findChildByLocalName(node, 'snippet')?.textContent?.trim() || '';
      const styleUrl = findChildByLocalName(node, 'styleurl')?.textContent?.trim() || '';
      const extendedData = parseExtendedData(node);

      // Determine category:
      // Priority: ExtendedData 'category' / 'categoria' -> Folder Name -> Geometry Type
      let category =
        extendedData.categoria ||
        extendedData.category ||
        extendedData.tipo ||
        extendedData.type ||
        extendedData.layer ||
        extendedData.camada ||
        folderName ||
        'Geral';

      // Detect Geometry
      let geometryType: GeometryType = 'Unknown';
      let point: LatLng | undefined;
      let lineCoordinates: LatLng[] | undefined;
      let polygonCoordinates: LatLng[][] | undefined;

      const pointNode = findDescendantsByLocalName(node, 'point')[0];
      const lineNode = findDescendantsByLocalName(node, 'linestring')[0];
      const polyNode = findDescendantsByLocalName(node, 'polygon')[0];
      const trackNode = findDescendantsByLocalName(node, 'track')[0];

      if (pointNode) {
        geometryType = 'Point';
        const coordsText = getTagText(pointNode, 'coordinates');
        const parsed = parseCoordinateTuples(coordsText);
        if (parsed.length > 0) {
          point = parsed[0];
        }
      } else if (lineNode) {
        geometryType = 'LineString';
        const coordsText = getTagText(lineNode, 'coordinates');
        lineCoordinates = parseCoordinateTuples(coordsText);
        if (lineCoordinates.length > 0) {
          point = lineCoordinates[0];
        }
      } else if (polyNode) {
        geometryType = 'Polygon';
        const outerCoords = getTagText(polyNode, 'coordinates');
        const parsed = parseCoordinateTuples(outerCoords);
        if (parsed.length > 0) {
          polygonCoordinates = [parsed];
          const sumLat = parsed.reduce((acc, p) => acc + p.lat, 0);
          const sumLng = parsed.reduce((acc, p) => acc + p.lng, 0);
          point = { lat: sumLat / parsed.length, lng: sumLng / parsed.length };
        }
      } else if (trackNode) {
        // Support Google Earth gx:Track coordinates (gx:coord lon lat alt)
        geometryType = 'LineString';
        const coordsEls = findDescendantsByLocalName(trackNode, 'coord');
        const parsedTrack: LatLng[] = [];
        for (const cEl of coordsEls) {
          const parts = (cEl.textContent || '').trim().split(/\s+/);
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) parsedTrack.push({ lat, lng });
          }
        }
        if (parsedTrack.length > 0) {
          lineCoordinates = parsedTrack;
          point = parsedTrack[0];
        }
      } else {
        // Fallback: check any coordinates tag inside placemark
        const anyCoords = getTagText(node, 'coordinates');
        const parsed = parseCoordinateTuples(anyCoords);
        if (parsed.length > 0) {
          geometryType = parsed.length > 1 ? 'LineString' : 'Point';
          point = parsed[0];
          if (parsed.length > 1) {
            lineCoordinates = parsed;
          }
        }
      }

      if (point) {
        if (category === 'Geral' && geometryType === 'LineString') {
          category = 'Trilhas & Rotas';
        } else if (category === 'Geral' && geometryType === 'Polygon') {
          category = 'Áreas & Polígonos';
        }

        categoryCounter[category] = (categoryCounter[category] || 0) + 1;
        const iconUrl = styleIconMap[styleUrl] || undefined;

        placemarks.push({
          id: `placemark-${placemarks.length + 1}`,
          name,
          description: rawDescription,
          category,
          categoryColor: '#2563eb',
          folderName,
          styleUrl,
          iconUrl,
          geometryType,
          point,
          lineCoordinates,
          polygonCoordinates,
          extendedData,
          snippet,
        });
      }
    }

    // Traverse child elements
    for (let i = 0; i < node.children.length; i++) {
      processNode(node.children[i], folderName);
    }
  }

  const rootDoc = xmlDoc.documentElement;
  processNode(rootDoc);

  // If no placemarks were extracted via hierarchy, try direct query of all Placemarks
  if (placemarks.length === 0) {
    const directPlacemarks = findDescendantsByLocalName(xmlDoc, 'placemark');
    for (const pmNode of directPlacemarks) {
      processNode(pmNode, '');
    }
  }

  if (placemarks.length === 0) {
    throw new Error(
      'Nenhum ponto ou coordenada geográfica foi encontrado no arquivo KMZ/KML. Verifique se o arquivo contém marcas de local (<Placemark>) válidas.'
    );
  }

  // Assign distinct colors to categories
  const categoriesList = Object.keys(categoryCounter);
  const categoryColorMap: Record<string, string> = {};
  categoriesList.forEach((cat, index) => {
    categoryColorMap[cat] = PALETTE[index % PALETTE.length];
  });

  placemarks.forEach((p) => {
    p.categoryColor = categoryColorMap[p.category] || '#2563eb';
  });

  const categories: CategoryInfo[] = categoriesList.map((name) => ({
    name,
    count: categoryCounter[name],
    color: categoryColorMap[name],
    visible: true,
  }));

  // Calculate Bounds
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  let hasBounds = false;

  for (const p of placemarks) {
    const pointsToCheck: LatLng[] = [];
    if (p.point) pointsToCheck.push(p.point);
    if (p.lineCoordinates) pointsToCheck.push(...p.lineCoordinates);
    if (p.polygonCoordinates) {
      p.polygonCoordinates.forEach((ring) => pointsToCheck.push(...ring));
    }

    for (const pt of pointsToCheck) {
      hasBounds = true;
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }
  }

  const bounds = hasBounds
    ? {
        north: maxLat,
        south: minLat,
        east: maxLng,
        west: minLng,
      }
    : undefined;

  return {
    fileName,
    fileSize,
    title: docTitle,
    description: docDesc,
    placemarks,
    categories,
    bounds,
    assetUrls,
  };
}
