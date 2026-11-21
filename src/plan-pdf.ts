// Client-ready floor plan PDFs: one floor, or every floor side by side, with the company's logo and details.
// jsPDF and react-dom/server are loaded on demand so they never weigh on the first page load.
import {createElement} from 'react';
import {designOf, levelName, type Plan, type Project, type Settings} from './types';
import {roomArea, totalArea} from './plan';
import {terraceLevel} from './terrace';

export type PdfFloor = {floor: number; label: string; area: number};
const MM = {margin: 12, header: 24, footer: 26, gap: 8};
const INK = [17, 17, 17] as const, MUTED = [90, 90, 90] as const, LINE = [210, 210, 210] as const;

/** Floors a client sees: every habitable level, plus the terrace plan. */
export function pdfFloors(plan: Plan, project: Project): PdfFloor[] {
  const top = terraceLevel(plan), count = Math.max(1, project.requirements.floors || plan.levels || 1);
  const floors: PdfFloor[] = [];
  for (let f = 0; f < Math.min(count, top); f++) floors.push({floor: f, label: levelName(f), area: Math.round(plan.rooms.filter(r => r.floor === f).reduce((s, r) => s + roomArea(r), 0))});
  floors.push({floor: top, label: 'Terrace', area: 0});
  return floors;
}

/** Render the furnished plan for one floor as clean SVG text: no selection, handles, hover states or toolbar; labels drawn above furniture. */
export async function planSvg(plan: Plan, floor: number): Promise<{svg: string; width: number; height: number}> {
  const [{renderToStaticMarkup}, {PlanView}] = await Promise.all([import('react-dom/server'), import('./components/PlanCanvas')]);
  const html = renderToStaticMarkup(createElement(PlanView, {plan, floor, compact: true}));
  const doc = new DOMParser().parseFromString(`<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>`, 'text/html');
  const svgs = [...doc.querySelectorAll('svg')];
  const svg = svgs.sort((a, b) => b.innerHTML.length - a.innerHTML.length)[0];
  if (!svg) throw new Error('The floor plan could not be drawn.');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.removeAttribute('class'); svg.removeAttribute('style');
  svg.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
  // Room names and sizes are stored before furniture inside each room group; move them to the end so they draw on top.
  const labels = [...svg.querySelectorAll('g[pointer-events="none"]')].filter(g => g.querySelector('text') && g.closest('[data-room-id]'));
  const host = svg.querySelector('g[transform]') || svg;
  labels.forEach(g => host.appendChild(g));
  svg.querySelectorAll('[role="button"],[tabindex]').forEach(el => { el.removeAttribute('role'); el.removeAttribute('tabindex'); });
  const vb = (svg.getAttribute('viewBox') || `0 0 ${plan.plotWidth} ${plan.plotDepth}`).split(/[ ,]+/).map(Number);
  const width = vb[2] || plan.plotWidth, height = vb[3] || plan.plotDepth;
  svg.setAttribute('width', String(width * 40)); svg.setAttribute('height', String(height * 40));
  return {svg: new XMLSerializer().serializeToString(svg), width, height};
}

async function svgToPng(svg: string, width: number, height: number, longSide = 2600): Promise<string> {
  const scale = longSide / Math.max(width, height), w = Math.round(width * scale), h = Math.round(height * scale);
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  try {
    const img = new Image(); img.decoding = 'async';
    await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error('The floor plan image could not be prepared.')); img.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

function imageSize(dataUrl: string): Promise<{w: number; h: number}> {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok({w: i.naturalWidth, h: i.naturalHeight}); i.onerror = () => fail(new Error('The company logo could not be read.')); i.src = dataUrl; });
}

/** Resize an uploaded logo to at most 600 × 240 px PNG so it stays small in settings and sharp in print. */
export async function prepareLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Choose a PNG, JPG or WebP logo.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a logo smaller than 5 MB.');
  const source = await new Promise<string>((ok, fail) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => fail(new Error('The logo could not be read.')); r.readAsDataURL(file); });
  const {w, h} = await imageSize(source), scale = Math.min(1, 600 / w, 240 / h);
  const img = new Image(); img.src = source; await img.decode();
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/png');
  if (out.length > 400_000) throw new Error('That logo is too detailed. Try a simpler PNG under 300 KB.');
  return out;
}

const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'house-concept';

/**
 * Build the PDF. `floors` picks the panels: one floor gives a single large plan, several are laid side by side on one sheet.
 * Returns the jsPDF document so tests and callers can inspect or save it.
 */
export async function buildPlanPdf(opts: {plan: Plan; project: Project; settings: Settings; floors: PdfFloor[]; date?: Date}) {
  const {plan, project, settings, floors} = opts;
  if (!floors.length) throw new Error('Choose at least one floor.');
  const {jsPDF} = await import('jspdf');
  const format = floors.length > 2 ? 'a3' : 'a4';
  const pdf = new jsPDF({orientation: 'landscape', unit: 'mm', format, compress: true});
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), m = MM.margin;
  const req = project.requirements, d = designOf(req), date = (opts.date || new Date()).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
  pdf.setProperties({title: `${project.title} – floor plans`, subject: 'House concept floor plans', creator: settings.companyName || 'House Concept Studio'});

  // Header: logo + company on the left, project on the right, hairline underneath.
  let x = m;
  if (settings.companyLogo) {
    try {
      const s = await imageSize(settings.companyLogo), maxH = 14, maxW = 48, k = Math.min(maxW / s.w, maxH / s.h);
      pdf.addImage(settings.companyLogo, 'PNG', x, m, s.w * k, s.h * k); x += s.w * k + 5;
    } catch { /* a broken logo never blocks the plan */ }
  }
  pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text(settings.companyName || 'House Concept Studio', x, m + 5.5);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED);
  const contact = [settings.companyPhone, settings.companyEmail, settings.companyWebsite].filter(Boolean).join('   ·   ');
  if (settings.companyTagline) pdf.text(settings.companyTagline, x, m + 10.5);
  if (contact) pdf.text(contact, x, m + (settings.companyTagline ? 15 : 10.5));
  pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.text(project.title || 'House concept', W - m, m + 5.5, {align: 'right'});
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...MUTED);
  pdf.text([req.customerName ? `Prepared for ${req.customerName}` : 'Concept floor plans', `${floors.length === 1 ? floors[0].label : `${floors.length} plans`} · ${date}`], W - m, m + 10.5, {align: 'right'});
  pdf.setDrawColor(...LINE); pdf.setLineWidth(.3); pdf.line(m, m + MM.header - 4, W - m, m + MM.header - 4);

  // Plan panels, equal width, all drawn at the same scale so floors compare honestly.
  const single = floors.length === 1, top = m + MM.header, bottom = H - m - MM.footer, panelH = bottom - top - 18;
  const scheduleW = single ? 92 : 0, panelW = (W - 2 * m - scheduleW - (single ? MM.gap : 0) - MM.gap * (floors.length - 1)) / floors.length;
  const drawn = await Promise.all(floors.map(f => planSvg(plan, f.floor)));
  const scale = Math.min(...drawn.map(p => Math.min(panelW / p.width, panelH / p.height)));
  for (let i = 0; i < floors.length; i++) {
    const f = floors[i], p = drawn[i], px = m + i * (panelW + MM.gap);
    const png = await svgToPng(p.svg, p.width, p.height, floors.length > 2 ? 2000 : 2600);
    const w = p.width * scale, h = p.height * scale;
    pdf.addImage(png, 'PNG', px + (panelW - w) / 2, top + 8, w, h, undefined, 'FAST');
    pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.text(f.label.toUpperCase(), px, top + 4);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...MUTED);
    if (f.area && !single) pdf.text(`${f.area.toLocaleString('en-IN')} sq ft`, px + panelW, top + 4, {align: 'right'});
  }

  // Single floor: room schedule beside the plan.
  if (single) {
    const sx0 = W - m - scheduleW, rooms = plan.rooms.filter(r => r.floor === floors[0].floor).sort((a, b) => roomArea(b) - roomArea(a));
    let y = top + 4; pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.text('ROOM SCHEDULE', sx0, y);
    y += 7; pdf.setFontSize(7.5); pdf.setTextColor(...MUTED); pdf.text('Room', sx0, y); pdf.text('Size (ft)', sx0 + 50, y); pdf.text('Area', sx0 + scheduleW, y, {align: 'right'});
    pdf.setDrawColor(...LINE); pdf.line(sx0, y + 2, sx0 + scheduleW, y + 2); y += 7;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    const ft = (v: number) => { const f = Math.floor(v), i = Math.round((v - f) * 12); return i ? `${f}'${i}"` : `${f}'`; };
    for (const r of rooms) {
      if (y > bottom - 8) { pdf.setTextColor(...MUTED); pdf.text(`+ ${rooms.length - rooms.indexOf(r)} more`, sx0, y); break; }
      const name = r.kind === 'bathroom' && r.attachedTo ? `${r.label} (attached)` : r.label;
      pdf.setTextColor(...INK); pdf.text(pdf.splitTextToSize(name, 46)[0] as string, sx0, y); pdf.setTextColor(...MUTED);
      pdf.text(`${ft(r.w)} x ${ft(r.h)}`, sx0 + 50, y); pdf.text(`${Math.round(roomArea(r))} sq ft`, sx0 + scheduleW, y, {align: 'right'});
      pdf.setDrawColor(235, 235, 235); pdf.line(sx0, y + 2.4, sx0 + scheduleW, y + 2.4); y += 6.6;
    }
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...INK); pdf.text('Total', sx0, y + 1); pdf.text(`${floors[0].area.toLocaleString('en-IN')} sq ft`, sx0 + scheduleW, y + 1, {align: 'right'});
  }

  // 10 ft scale bar just under the plans (each plan carries its own north compass).
  const bar = 10 * scale, sx = m, sy = top + 8 + Math.max(...drawn.map(p => p.height * scale)) + 6;
  pdf.setLineWidth(.4); pdf.line(sx, sy, sx + bar, sy); pdf.line(sx, sy - 1.2, sx, sy + 1.2); pdf.line(sx + bar, sy - 1.2, sx + bar, sy + 1.2);
  pdf.setFontSize(7); pdf.setTextColor(...MUTED); pdf.text('10 ft', sx + bar + 2, sy + 1);

  // Footer title block: project facts | company contact | disclaimer.
  const fy = H - m - MM.footer + 4; pdf.setDrawColor(...LINE); pdf.line(m, fy - 3, W - m, fy - 3);
  const col = (W - 2 * m) / 3, facts = [
    `Plot ${req.plotWidth} × ${req.plotDepth} ft · Road on ${req.roadSide}`,
    `House ${plan.width} × ${plan.depth} ft · Enclosed ${totalArea(plan).toLocaleString('en-IN')} sq ft`,
    `Facing ${d.houseFacing || req.roadSide} · Main door ${d.mainDoorFacing || '-'}`,
    req.location ? `Site: ${req.location}` : '',
  ].filter(Boolean);
  pdf.setFontSize(7.5); pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.text('PROJECT', m, fy + 1); pdf.text('CONTACT', m + col, fy + 1); pdf.text('NOTE', m + 2 * col, fy + 1);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED);
  pdf.text(facts, m, fy + 5.5, {lineHeightFactor: 1.35});
  const address = [settings.companyName, ...(settings.companyAddress ? pdf.splitTextToSize(settings.companyAddress, col - 6) as string[] : []), [settings.companyPhone, settings.companyEmail].filter(Boolean).join(' · '), settings.companyGstin ? `GSTIN ${settings.companyGstin}` : ''].filter(Boolean);
  pdf.text(address.slice(0, 5), m + col, fy + 5.5, {lineHeightFactor: 1.35});
  pdf.text(pdf.splitTextToSize('Concept plan for discussion with the customer. Not for construction or approval. All dimensions are in feet and must be verified by the architect on site.', col - 4) as string[], m + 2 * col, fy + 5.5, {lineHeightFactor: 1.35});
  return {pdf, fileName: `${safeName(project.title)}-${floors.length === 1 ? safeName(floors[0].label) : 'all-floors'}-plan.pdf`};
}

export async function downloadPlanPdf(opts: Parameters<typeof buildPlanPdf>[0]) {
  const {pdf, fileName} = await buildPlanPdf(opts);
  pdf.save(fileName);
  return fileName;
}
