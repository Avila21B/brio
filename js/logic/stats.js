// Agregados para estadísticas, calendario y etiquetas.
import { dayKey, startOfWeek, startOfMonth, addDays, sum, daysInMonth, WEEKDAYS_SHORT, MONTHS_SHORT, startOfDay } from '../util.js';
import { activity } from '../data/activities.js';

export const between = (state, a, b) =>
  state.workouts.filter((w) => { const t = new Date(w.startAt); return t >= a && t < b; });

export const totals = (ws) => ({
  count: ws.length,
  minutes: Math.round(sum(ws, (w) => w.durationMin)),
  kcal: Math.round(sum(ws, (w) => w.kcal)),
  km: Math.round(sum(ws, (w) => w.distanceKm) * 10) / 10,
});

export function rangeBounds(range, anchor) {
  if (range === 'week') { const a = startOfWeek(anchor); return [a, addDays(a, 7)]; }
  if (range === 'month') { const a = startOfMonth(anchor); return [a, new Date(a.getFullYear(), a.getMonth() + 1, 1)]; }
  const a = new Date(anchor.getFullYear(), 0, 1);
  return [a, new Date(anchor.getFullYear() + 1, 0, 1)];
}

const metricOf = (w, metric) => (metric === 'minutes' ? w.durationMin : metric === 'kcal' ? w.kcal : w.distanceKm) || 0;

export function series(state, range, anchor, metric) {
  const [a, b] = rangeBounds(range, anchor);
  const ws = between(state, a, b);
  let buckets;
  if (range === 'week') {
    buckets = WEEKDAYS_SHORT.map((l, i) => ({ label: l, key: dayKey(addDays(a, i)), value: 0 }));
  } else if (range === 'month') {
    buckets = Array.from({ length: daysInMonth(a) }, (_, i) => {
      const d = addDays(a, i);
      return { label: (i + 1) % 5 === 1 ? String(i + 1) : '', key: dayKey(d), value: 0 };
    });
  } else {
    buckets = MONTHS_SHORT.map((l, i) => ({ label: l[0].toUpperCase(), key: String(i), value: 0 }));
  }
  const idx = Object.fromEntries(buckets.map((x, i) => [x.key, i]));
  for (const w of ws) {
    const t = new Date(w.startAt);
    const k = range === 'year' ? String(t.getMonth()) : dayKey(t);
    if (k in idx) buckets[idx[k]].value += metricOf(w, metric);
  }
  for (const x of buckets) x.value = Math.round(x.value * 10) / 10;
  return { buckets, workouts: ws, from: a, to: b };
}

// Minutos por día para el mapa de calor (semanas completas, lunes primero)
export function heatmap(state, weeks = 26, end = new Date()) {
  const lastMonday = startOfWeek(end);
  const start = addDays(lastMonday, -7 * (weeks - 1));
  const map = {};
  for (const w of state.workouts) {
    const k = dayKey(w.startAt);
    map[k] = (map[k] || 0) + (w.durationMin || 0);
  }
  const cols = [];
  for (let c = 0; c < weeks; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = addDays(start, c * 7 + r);
      col.push({ date: d, key: dayKey(d), minutes: map[dayKey(d)] || 0, future: d > startOfDay(end) });
    }
    cols.push(col);
  }
  return cols;
}

export function byActivity(ws) {
  const m = {};
  for (const w of ws) {
    const x = (m[w.activityId] ||= { activity: activity(w.activityId), count: 0, minutes: 0 });
    x.count++;
    x.minutes += w.durationMin || 0;
  }
  return Object.values(m).sort((a, b) => b.minutes - a.minutes);
}

export function tagTotals(state, tagId) {
  return totals(state.workouts.filter((w) => (w.tagIds || []).includes(tagId)));
}

export const byDay = (state) => {
  const m = {};
  for (const w of state.workouts) (m[dayKey(w.startAt)] ||= []).push(w);
  return m;
};
