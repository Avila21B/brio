// S13 Estadísticas y S14 Calendario.
import { get } from '../store.js';
import { esc, dayKey, startOfMonth, addMonths, addDays, daysInMonth, fmtDur, fmtNum, fmtDate, fmtTime, MONTHS, WEEKDAYS_SHORT, startOfWeek } from '../util.js';
import { series, totals, heatmap, byActivity, rangeBounds, byDay } from '../logic/stats.js';
import { activity } from '../data/activities.js';
import { topbar, wireBack, sheet } from '../ui.js';
import { bars, heat } from '../ui/art.js';

const ui = { range: 'week', metric: 'minutes', anchor: new Date(), calMode: 'month', calAnchor: startOfMonth(new Date()) };

export function render(root, r) {
  return r.name === 'calendar' ? calendar(root) : stats(root);
}

function shift(n) {
  const a = ui.anchor;
  ui.anchor = ui.range === 'week' ? addDays(a, 7 * n) : ui.range === 'month' ? addMonths(a, n) : new Date(a.getFullYear() + n, 0, 1);
}

function rangeLabel() {
  const [a, b] = rangeBounds(ui.range, ui.anchor);
  if (ui.range === 'week') return `${fmtDate(a)} – ${fmtDate(addDays(b, -1))}`;
  if (ui.range === 'month') return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  return String(a.getFullYear());
}

function stats(root) {
  const st = get();
  const { buckets, workouts, to } = series(st, ui.range, ui.anchor, ui.metric);
  const t = totals(workouts);
  const isCurrent = to > new Date();
  const unit = { minutes: 'min', kcal: 'kcal', km: 'km' }[ui.metric];
  const acts = byActivity(workouts);
  const maxMin = Math.max(1, ...acts.map((x) => x.minutes));
  const highlight = ui.range === 'year' ? String(new Date().getMonth()) : dayKey();

  root.innerHTML = `${topbar('Progreso', { right: '<a class="icon-btn" href="#/calendar" aria-label="Calendario">📅</a><a class="icon-btn" href="#/tags" aria-label="Equipo y etiquetas">🏷️</a>' })}
  <div class="stack">
    <div class="seg" role="group" aria-label="Periodo">
      ${[['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']].map(([k, l]) => `<button data-range="${k}" aria-pressed="${ui.range === k}">${l}</button>`).join('')}
    </div>
    <div class="row between">
      <button class="icon-btn" data-shift="-1" aria-label="Anterior">‹</button>
      <b>${rangeLabel()}</b>
      <button class="icon-btn" data-shift="1" aria-label="Siguiente" ${isCurrent ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <div class="stat-grid">
      <div class="stat"><b>${t.count}</b><span>entrenos</span></div>
      <div class="stat"><b>${fmtDur(t.minutes)}</b><span>tiempo activo</span></div>
      <div class="stat"><b>${fmtNum(t.kcal)}</b><span>kcal quemadas</span></div>
      <div class="stat"><b>${fmtNum(t.km, 1)} km</b><span>distancia</span></div>
    </div>
    <div class="card stack-s">
      <div class="seg" role="group" aria-label="Métrica">
        ${[['minutes', 'Minutos'], ['kcal', 'Kcal'], ['km', 'Km']].map(([k, l]) => `<button data-metric="${k}" aria-pressed="${ui.metric === k}">${l}</button>`).join('')}
      </div>
      ${bars(buckets, { unit, highlightKey: highlight })}
    </div>
    <div class="card stack-s">
      <div class="row between"><h3>Últimos 6 meses</h3>
        <div class="legend">menos <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> más</div></div>
      ${heat(heatmap(st, 26))}
    </div>
    <div class="card">
      <h3 style="margin-bottom:8px">Por actividad</h3>
      ${acts.length ? `<div class="stack-s">${acts.map((x) => `<div class="stack-s" style="gap:4px">
        <div class="row between small"><span>${x.activity.icon} <b>${esc(x.activity.name)}</b> <span class="muted">×${x.count}</span></span><span class="bold">${fmtDur(x.minutes)}</span></div>
        <div class="progress" style="height:8px"><i style="width:${(x.minutes / maxMin) * 100}%"></i></div></div>`).join('')}</div>`
      : '<div class="empty"><span class="big">📭</span><p>Sin entrenos en este periodo.</p></div>'}
    </div>
  </div>`;

  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { ui.range = b.dataset.range; ui.anchor = new Date(); stats(root); }));
  root.querySelectorAll('[data-metric]').forEach((b) => b.addEventListener('click', () => { ui.metric = b.dataset.metric; stats(root); }));
  root.querySelectorAll('[data-shift]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) { shift(Number(b.dataset.shift)); stats(root); } }));
}

function calendar(root) {
  const st = get();
  const days = byDay(st);
  const today = dayKey();
  const a = ui.calAnchor;
  let body;

  if (ui.calMode === 'month') {
    const lead = (a.getDay() + 6) % 7;
    const n = daysInMonth(a);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="c blank"></span>');
    for (let d = 1; d <= n; d++) {
      const k = dayKey(new Date(a.getFullYear(), a.getMonth(), d));
      const ws = days[k] || [];
      cells.push(ws.length
        ? `<button class="c on ${k === today ? 'today' : ''}" data-day="${k}" aria-label="${d}: ${ws.length} entreno${ws.length > 1 ? 's' : ''}"><span class="e">${activity(ws[0].activityId).icon}</span>${d}</button>`
        : `<span class="c ${k === today ? 'today' : ''}">${d}</span>`);
    }
    const monthWs = Object.entries(days).filter(([k]) => k.startsWith(`${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}`)).flatMap(([, v]) => v);
    const t = totals(monthWs);
    body = `<div class="card stack-s"><div class="cal">${WEEKDAYS_SHORT.map((d) => `<span class="h">${d}</span>`).join('')}${cells.join('')}</div></div>
      <div class="stat-grid"><div class="stat"><b>${new Set(monthWs.map((w) => dayKey(w.startAt))).size}</b><span>días activos</span></div><div class="stat"><b>${fmtDur(t.minutes)}</b><span>tiempo</span></div></div>`;
  } else {
    const y = a.getFullYear();
    body = `<div class="card"><div class="mini-year">${MONTHS.map((m, mi) => {
      const first = new Date(y, mi, 1), lead = (first.getDay() + 6) % 7, n = daysInMonth(first);
      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<i class="b"></i>';
      for (let d = 1; d <= n; d++) cells += `<i class="${days[dayKey(new Date(y, mi, d))] ? 'on' : ''}"></i>`;
      return `<button class="m" data-month="${mi}" style="background:none;border:0;padding:0;cursor:pointer;text-align:left"><span class="xs bold">${m}</span><span class="mg">${cells}</span></button>`;
    }).join('')}</div></div>
    <p class="center small muted">${Object.keys(days).filter((k) => k.startsWith(String(y))).length} días activos en ${y}</p>`;
  }

  const label = ui.calMode === 'month' ? `${MONTHS[a.getMonth()]} ${a.getFullYear()}` : String(a.getFullYear());
  root.innerHTML = `${topbar('Calendario', { backHref: '#/stats' })}
  <div class="stack">
    <div class="seg" role="group" aria-label="Vista"><button data-mode="month" aria-pressed="${ui.calMode === 'month'}">Mes</button><button data-mode="year" aria-pressed="${ui.calMode === 'year'}">Año</button></div>
    <div class="row between"><button class="icon-btn" data-nav="-1" aria-label="Anterior">‹</button><b style="text-transform:capitalize">${label}</b><button class="icon-btn" data-nav="1" aria-label="Siguiente">›</button></div>
    ${body}
  </div>`;
  wireBack(root);

  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { ui.calMode = b.dataset.mode; calendar(root); }));
  root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.nav);
    ui.calAnchor = ui.calMode === 'month' ? addMonths(a, n) : new Date(a.getFullYear() + n, 0, 1);
    calendar(root);
  }));
  root.querySelectorAll('[data-month]').forEach((b) => b.addEventListener('click', () => {
    ui.calAnchor = new Date(a.getFullYear(), Number(b.dataset.month), 1); ui.calMode = 'month'; calendar(root);
  }));
  root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => {
    const ws = days[b.dataset.day];
    sheet(`<div class="stack"><h2>${fmtDate(ws[0].startAt, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><div class="list">${ws.map((w) => {
      const ac = activity(w.activityId);
      return `<a class="list-item" href="#/workout/${w.id}" data-close><span class="list-ico">${ac.icon}</span><span class="grow"><b>${esc(ac.name)}</b><br><span class="small muted">${fmtTime(w.startAt)} · ${fmtDur(w.durationMin)}${w.distanceKm ? ` · ${fmtNum(w.distanceKm, 1)} km` : ''}</span></span>›</a>`;
    }).join('')}</div></div>`, { label: 'Entrenos del día' });
  }));
}
