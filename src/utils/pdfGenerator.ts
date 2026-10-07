import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { PlacemarkFeature, LatLng, RouteResultDetails } from '../types/kml';

/**
 * Generates formatted text and WhatsApp share URL for a placemark
 * (Category removed as requested)
 */
export function createWhatsAppMessage(pm: PlacemarkFeature): string {
  const coords = pm.point ? `${pm.point.lat.toFixed(5)}, ${pm.point.lng.toFixed(5)}` : '';
  const mapsUrl = pm.point
    ? `https://www.google.com/maps/dir/?api=1&destination=${pm.point.lat},${pm.point.lng}`
    : '';

  let msg = `📍 *Local:* ${pm.name}\n`;
  if (coords) {
    msg += `📌 *Coordenadas:* ${coords}\n`;
  }
  if (pm.description && pm.description.trim()) {
    const cleanDesc = pm.description.replace(/<[^>]*>/g, '').trim();
    if (cleanDesc) {
      msg += `📝 *Info:* ${cleanDesc.slice(0, 120)}${cleanDesc.length > 120 ? '...' : ''}\n`;
    }
  }
  if (mapsUrl) {
    msg += `🗺️ *Traçar rota no Google Maps:*\n${mapsUrl}`;
  }
  return msg;
}

export function createWhatsAppUrl(pm: PlacemarkFeature): string {
  const text = createWhatsAppMessage(pm);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Generates an in-memory canvas image representing the single Territory Overview Map
 * showing the boundaries/limits and all chosen locations with their names.
 */
export function createOverviewMapCanvas(
  placemarks: PlacemarkFeature[],
  width = 1000,
  height = 460
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const validPlacemarks = placemarks.filter((p) => p.point);
  if (validPlacemarks.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  // Calculate bounding box of all points and any lines/polygons
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const pm of validPlacemarks) {
    const pts: LatLng[] = [];
    if (pm.point) pts.push(pm.point);
    if (pm.lineCoordinates) pts.push(...pm.lineCoordinates);
    if (pm.polygonCoordinates) {
      pm.polygonCoordinates.forEach((ring) => pts.push(...ring));
    }

    for (const pt of pts) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }
  }

  // Ensure minimum span so single points or points in line don't divide by zero
  let spanLat = maxLat - minLat;
  let spanLng = maxLng - minLng;
  if (spanLat < 0.01) spanLat = 0.02;
  if (spanLng < 0.01) spanLng = 0.02;

  // Add 16% margin around boundaries for labels and pins
  const padLat = spanLat * 0.16;
  const padLng = spanLng * 0.16;
  const boundMinLat = minLat - padLat;
  const boundMaxLat = maxLat + padLat;
  const boundMinLng = minLng - padLng;
  const boundMaxLng = maxLng + padLng;

  // Projection helper
  const padX = 46;
  const padY = 46;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;

  const project = (pt: LatLng) => {
    const x = padX + ((pt.lng - boundMinLng) / (boundMaxLng - boundMinLng)) * plotWidth;
    const y = padY + (1 - (pt.lat - boundMinLat) / (boundMaxLat - boundMinLat)) * plotHeight;
    return { x, y };
  };

  // 1. Map Canvas Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Decorative coordinate grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const gridSteps = 6;
  for (let i = 1; i < gridSteps; i++) {
    const gx = padX + (plotWidth / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(gx, padY);
    ctx.lineTo(gx, height - padY);
    ctx.stroke();

    const gy = padY + (plotHeight / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(padX, gy);
    ctx.lineTo(width - padX, gy);
    ctx.stroke();
  }

  // 2. Draw Territory Boundary Limits Frame
  const topLeft = project({ lat: maxLat, lng: minLng });
  const bottomRight = project({ lat: minLat, lng: maxLng });
  const boxX = Math.min(topLeft.x, bottomRight.x) - 10;
  const boxY = Math.min(topLeft.y, bottomRight.y) - 10;
  const boxW = Math.abs(bottomRight.x - topLeft.x) + 20;
  const boxH = Math.abs(bottomRight.y - topLeft.y) + 20;

  // Shaded territory area
  ctx.fillStyle = 'rgba(37, 99, 235, 0.035)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Dashed boundary line
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  // Boundary tag label in corner of limit box
  ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('⛶ LIMITES DO TERRITÓRIO', boxX + 6, Math.max(boxY - 4, 18));

  // 3. Draw Lines / Polygons if present in placemarks
  for (const pm of validPlacemarks) {
    if (pm.polygonCoordinates) {
      for (const ring of pm.polygonCoordinates) {
        if (ring.length > 2) {
          ctx.beginPath();
          const start = project(ring[0]);
          ctx.moveTo(start.x, start.y);
          for (let k = 1; k < ring.length; k++) {
            const p = project(ring[k]);
            ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    if (pm.lineCoordinates && pm.lineCoordinates.length > 1) {
      ctx.beginPath();
      const start = project(pm.lineCoordinates[0]);
      ctx.moveTo(start.x, start.y);
      for (let k = 1; k < pm.lineCoordinates.length; k++) {
        const p = project(pm.lineCoordinates[k]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // 4. Draw Connecting Route Line between Points
  if (validPlacemarks.length > 1) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const firstPt = project(validPlacemarks[0].point!);
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < validPlacemarks.length; i++) {
      const nextPt = project(validPlacemarks[i].point!);
      ctx.lineTo(nextPt.x, nextPt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5. Draw Location Pins and Names
  validPlacemarks.forEach((pm, idx) => {
    if (!pm.point) return;
    const { x, y } = project(pm.point);
    const color = pm.categoryColor || '#2563eb';

    // Halo pulse around pin
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color + '28';
    ctx.fill();

    // Solid pin circle
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pin index number inside
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${idx + 1}`, x, y);

    // Label with location name
    const labelText = `${idx + 1}. ${pm.name}`;
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const pillW = textWidth + 14;
    const pillH = 19;

    // Alternate label position (top, bottom, right) to prevent overlap
    let pillX = x + 10;
    let pillY = y - 9;
    if (idx % 2 === 1) {
      pillY = y + 10;
    }
    if (pillX + pillW > width - 12) {
      pillX = x - pillW - 10;
    }
    if (pillY < 12) {
      pillY = y + 12;
    }
    if (pillY + pillH > height - 12) {
      pillY = y - pillH - 8;
    }

    // Label shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.roundRect(pillX + 1, pillY + 1, pillW, pillH, 5);
    ctx.fill();

    // Label pill background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Small category indicator dot inside pill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pillX + 6, pillY + pillH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Location name text
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, pillX + 13, pillY + pillH / 2);
  });

  // 6. Header Banner inside Map
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 310, 24, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAPA DE LIMITES DO TERRITÓRIO E LOCALIDADES', 18, 22);

  // 7. Compass Rose (Top-Right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(width - 38, 10, 28, 28, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('N', width - 24, 21);
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(width - 24, 23);
  ctx.lineTo(width - 28, 32);
  ctx.lineTo(width - 20, 32);
  ctx.closePath();
  ctx.fill();

  // 8. Bottom Coordinates Bar
  const coordInfo = `Extensão: Lat ${minLat.toFixed(4)}° a ${maxLat.toFixed(4)}° | Lng ${minLng.toFixed(4)}° a ${maxLng.toFixed(4)}° • ${validPlacemarks.length} localidades`;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.beginPath();
  ctx.roundRect(10, height - 24, ctx.measureText(coordInfo).width + 18, 18, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(coordInfo, 18, height - 15);

  // Outer border of entire canvas
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  return canvas.toDataURL('image/png');
}

/**
 * Generates and downloads a clean, professional PDF with interactive Google Maps links
 * - Features ONLY ONE single Territory Limits Overview Map at the beginning of the PDF.
 * - Does NOT include mini-maps on each individual location card.
 * - Each card has clickable Google Maps & WhatsApp links.
 */
export async function generateAndDownloadPdf({
  title,
  placemarks,
  origin,
  originLabel,
  routeDetails,
}: {
  title: string;
  placemarks: PlacemarkFeature[];
  origin: LatLng | null;
  originLabel: string;
  routeDetails: RouteResultDetails | null;
}): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let cursorY = margin;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, cursorY, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.slice(0, 52), margin + 8, cursorY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(
    `Gerado em: ${dateStr} • ${placemarks.length} localidades • Links de rota e WhatsApp inclusos`,
    margin + 8,
    cursorY + 17
  );

  cursorY += 26;

  // 2. Route Info (if route is active)
  if (routeDetails && origin) {
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(margin, cursorY, contentWidth, 13, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text('Rota Ativa no Mapa:', margin + 4, cursorY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(
      `Partida: ${originLabel} | Distância: ${routeDetails.distanceText} | Tempo: ${routeDetails.durationText}`,
      margin + 4,
      cursorY + 10.5
    );

    cursorY += 16;
  }

  // 3. SINGLE TERRITORY LIMITS OVERVIEW MAP (ONLY AT THE BEGINNING OF THE PDF)
  const overviewMapHeight = 74; // mm
  try {
    const overviewImg = createOverviewMapCanvas(placemarks, 1000, 460);
    doc.addImage(overviewImg, 'PNG', margin, cursorY, contentWidth, overviewMapHeight);

    // Section title beneath overview map
    cursorY += overviewMapHeight + 6;
  } catch (err) {
    console.warn('Falha ao renderizar mapa geral de visão', err);
  }

  // Divider banner
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, cursorY, contentWidth, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('LOCALIDADES DO TERRITÓRIO (DETALHES E LINKS DIRETOS)', margin + 4, cursorY + 4.8);

  cursorY += 10;

  // 4. Compact placemark cards (NO MINI-MAPS IN INDIVIDUAL CARDS)
  const cardHeight = 27; // mm

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    if (!pm.point) continue;

    // Check if new page is needed
    if (cursorY + cardHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;

      // Small continuation header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, cursorY, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${title} (continuação - localidades)`, margin + 4, cursorY + 4.8);
      cursorY += 11;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pm.point.lat},${pm.point.lng}`;
    const waUrl = createWhatsAppUrl(pm);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 1.5, 1.5, 'FD');

    // Accent left stripe with category color
    doc.setFillColor(pm.categoryColor || '#2563eb');
    doc.roundedRect(margin, cursorY, 3, cardHeight, 1.5, 1.5, 'F');

    // Index number badge
    const badgeX = margin + 6;
    const badgeY = cursorY + 4;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(badgeX, badgeY, 7, 7, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`${i + 1}`, badgeX + 3.5, badgeY + 4.8, { align: 'center' });

    // Location Name
    const textStartX = badgeX + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(pm.name.slice(0, 52), textStartX, cursorY + 8.5);

    // Coordinates
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Lat: ${pm.point.lat.toFixed(5)}, Lng: ${pm.point.lng.toFixed(5)}`,
      textStartX,
      cursorY + 14
    );

    // Clickable Action Buttons: Google Maps (Blue) + WhatsApp (Green)
    const btnY = cursorY + 17.5;
    const btnH = 6.8;

    // 1. Google Maps Route Button (Blue)
    const btnMapsX = textStartX;
    const btnMapsW = 46;
    doc.setFillColor(37, 99, 235); // blue-600
    doc.roundedRect(btnMapsX, btnY, btnMapsW, btnH, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('Rota Google Maps >', btnMapsX + 4, btnY + 4.6);
    doc.link(btnMapsX, btnY, btnMapsW, btnH, { url: mapsUrl });

    // 2. WhatsApp Button (Green)
    const btnWaX = btnMapsX + btnMapsW + 3;
    const btnWaW = 48;
    doc.setFillColor(22, 163, 74); // emerald-600 / whatsapp
    doc.roundedRect(btnWaX, btnY, btnWaW, btnH, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('Enviar no WhatsApp >', btnWaX + 4, btnY + 4.6);
    doc.link(btnWaX, btnY, btnWaW, btnH, { url: waUrl });

    // QR Code (Right side of card)
    try {
      const qrDataUrl = await QRCode.toDataURL(mapsUrl, {
        width: 80,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      const qrSize = 19;
      const qrX = margin + contentWidth - qrSize - 4;
      const qrY = cursorY + 4;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('Rota no celular', qrX + 1.5, qrY + qrSize + 3);
    } catch (e) {
      console.warn('QR code embed error', e);
    }

    cursorY += cardHeight + 3.5;
  }

  // Save/Download PDF
  const safeName = (title || 'mapa_territorio')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  doc.save(`${safeName}.pdf`);
}
