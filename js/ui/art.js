// Arte en SVG: mascota "Chispi" (llamita original), anillos, barras, mapa de calor, ruta.
import { esc, fmtNum, MONTHS_SHORT } from '../util.js';

let gid = 0;

export function mascot(mood = 'normal') {
  const id = ++gid;
  const eyes = {
    normal: '<circle cx="47" cy="92" r="5.5" fill="#2b1d14"/><circle cx="73" cy="92" r="5.5" fill="#2b1d14"/><circle cx="49" cy="90" r="1.8" fill="#fff"/><circle cx="75" cy="90" r="1.8" fill="#fff"/>',
    happy: '<path d="M41 93 q6 -8 12 0" stroke="#2b1d14" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M67 93 q6 -8 12 0" stroke="#2b1d14" stroke-width="4" fill="none" stroke-linecap="round"/>',
    party: '<path d="M41 93 q6 -8 12 0" stroke="#2b1d14" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M67 93 q6 -8 12 0" stroke="#2b1d14" stroke-width="4" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M42 90 l10 4" stroke="#2b1d14" stroke-width="3.5" stroke-linecap="round"/><path d="M78 90 l-10 4" stroke="#2b1d14" stroke-width="3.5" stroke-linecap="round"/><circle cx="47" cy="98" r="4.5" fill="#2b1d14"/><circle cx="73" cy="98" r="4.5" fill="#2b1d14"/><path d="M44 104 q-3 7 0 9 q3 -2 0 -9z" fill="#5aa6ff"/>',
    sleepy: '<path d="M41 94 h12" stroke="#2b1d14" stroke-width="4" stroke-linecap="round"/><path d="M67 94 h12" stroke="#2b1d14" stroke-width="4" stroke-linecap="round"/>',
  }[mood] || '';
  const mouth = {
    normal: '<path d="M54 106 q6 5 12 0" stroke="#2b1d14" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M51 104 q9 12 18 0 z" fill="#2b1d14"/><path d="M55 108 q5 4 10 0" fill="#ff7b7b"/>',
    party: '<ellipse cx="60" cy="108" rx="9" ry="7" fill="#2b1d14"/><ellipse cx="60" cy="111" rx="5" ry="3" fill="#ff7b7b"/>',
    sad: '<path d="M53 113 q7 -7 14 0" stroke="#2b1d14" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    sleepy: '<ellipse cx="60" cy="109" rx="4" ry="3" fill="#2b1d14"/>',
  }[mood] || '';
  const extras = {
    party: '<g font-size="14"><text x="2" y="40">✨</text><text x="98" y="30">🎉</text><text x="104" y="76">✨</text></g>',
    sleepy: '<text class="zz" x="92" y="52" font-size="16" font-weight="800" fill="currentColor">z</text>',
    sad: '',
  }[mood] || '';
  const arms = mood === 'party'
    ? '<path d="M22 96 q-12 -14 -8 -26" stroke="#ff8b3d" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M98 96 q12 -14 8 -26" stroke="#ff8b3d" stroke-width="7" fill="none" stroke-linecap="round"/>'
    : mood === 'sad'
      ? '<path d="M22 104 q-6 8 -4 16" stroke="#c98a6a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M98 104 q6 8 4 16" stroke="#c98a6a" stroke-width="7" fill="none" stroke-linecap="round"/>'
      : '<path d="M22 102 q-10 4 -10 12" stroke="#ff8b3d" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M98 102 q10 4 10 12" stroke="#ff8b3d" stroke-width="7" fill="none" stroke-linecap="round"/>';
  const label = { normal: 'tranquilo', happy: 'feliz', party: 'celebrando', sad: 'triste', sleepy: 'con sueño' }[mood];
  return `<svg class="mascot m-${mood}" viewBox="0 0 120 150" role="img" aria-label="Chispi está ${label}">
    <defs>
      <linearGradient id="fg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc044"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient>
      <linearGradient id="fgs${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3b59a"/><stop offset="1" stop-color="#b9785a"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="144" rx="34" ry="5" fill="currentColor" opacity=".12"/>
    <g class="body">
      ${arms}
      <path fill="url(#${mood === 'sad' ? 'fgs' : 'fg'}${id})" d="M60 8 C70 32 104 50 104 92 C104 120 84 140 60 140 C36 140 16 120 16 92 C16 70 28 60 36 42 C40 58 48 64 53 62 C49 44 51 26 60 8 Z"/>
      <ellipse cx="60" cy="112" rx="28" ry="24" fill="${mood === 'sad' ? '#f1d9c8' : '#ffe08a'}" opacity=".9"/>
      <ellipse cx="38" cy="104" rx="6" ry="4" fill="#ff7b7b" opacity="${mood === 'sad' ? 0 : 0.55}"/>
      <ellipse cx="82" cy="104" rx="6" ry="4" fill="#ff7b7b" opacity="${mood === 'sad' ? 0 : 0.55}"/>
      ${eyes}${mouth}
    </g>
    ${extras}
  </svg>`;
}

export function ring(value, max, { size = 120, stroke = 12, cls = '', center = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="ring-bar ${cls}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg><div class="ring-center">${center}</div></div>`;
}

export function bars(buckets, { unit = '', highlightKey = null } = {}) {
  const W = 320, H = 150, top = 16, bottom = 20, left = 4;
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const n = buckets.length, slot = (W - left) / n, bw = Math.max(2, Math.min(28, slot * 0.62));
  const h = H - top - bottom;
  const items = buckets.map((b, i) => {
    const bh = b.value > 0 ? Math.max(3, (b.value / max) * h) : 0;
    const x = left + i * slot + (slot - bw) / 2, y = top + h - bh;
    return `<rect class="bar ${b.key === highlightKey ? 'today' : ''}" x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${Math.min(6, bw / 2)}">
      <title>${esc(b.title || b.label || b.key)}: ${fmtNum(b.value, b.value % 1 ? 1 : 0)} ${unit}</title></rect>
      ${b.label ? `<text x="${x + bw / 2}" y="${H - 5}" text-anchor="middle">${esc(b.label)}</text>` : ''}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras, máximo ${fmtNum(max)} ${unit}">
    <line class="grid" x1="0" x2="${W}" y1="${top}" y2="${top}"/><text x="${W}" y="${top - 4}" text-anchor="end">${fmtNum(max, max % 1 ? 1 : 0)} ${unit}</text>
    <line class="grid" x1="0" x2="${W}" y1="${top + h}" y2="${top + h}"/>${items}</svg>`;
}

export function heat(cols) {
  const cell = 11, gap = 2.5, top = 12, left = 0;
  const W = cols.length * (cell + gap), H = top + 7 * (cell + gap);
  const lvl = (m) => (m <= 0 ? 0 : m < 20 ? 1 : m < 45 ? 2 : m < 90 ? 3 : 4);
  let lastMonth = -1, labels = '';
  const rects = cols.map((col, c) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) { labels += `<text x="${left + c * (cell + gap)}" y="8">${MONTHS_SHORT[m]}</text>`; lastMonth = m; }
    return col.map((d, r) => `<rect x="${left + c * (cell + gap)}" y="${top + r * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5"
      class="${d.future ? 'fut' : 'l' + lvl(d.minutes)}"><title>${d.key}: ${Math.round(d.minutes)} min</title></rect>`).join('');
  }).join('');
  return `<svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa de calor de minutos activos por día">${labels}${rects}</svg>`;
}

export function route(points, { height = 220 } = {}) {
  if (!points || points.length < 2) return '';
  const lats = points.map((p) => p[0]), lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = ((minLat + maxLat) / 2) * Math.PI / 180;
  const W = 320, H = height, pad = 18;
  const spanX = Math.max(1e-6, (maxLng - minLng) * Math.cos(midLat)), spanY = Math.max(1e-6, maxLat - minLat);
  const s = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const ox = (W - spanX * s) / 2, oy = (H - spanY * s) / 2;
  const xy = (p) => [ox + (p[1] - minLng) * Math.cos(midLat) * s, H - (oy + (p[0] - minLat) * s)];
  const d = points.map((p, i) => { const [x, y] = xy(p); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');
  const [sx, sy] = xy(points[0]), [ex, ey] = xy(points[points.length - 1]);
  return `<svg class="route" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recorrido"><path d="${d}"/>
    <circle class="start" cx="${sx}" cy="${sy}" r="6"/><circle class="end" cx="${ex}" cy="${ey}" r="6"/></svg>`;
}
