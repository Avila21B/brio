// Rachas por periodos (semana lunes–domingo o mes), escudos, ánimo de la mascota y recompensas.
import { startOfWeek, startOfMonth, startOfDay, addDays, addMonths, dayKey, sum, fmtDate, MONTHS } from '../util.js';
import { CARDS, RARITY } from '../data/cards.js';

export const GOAL_TYPES = {
  days_per_week: { label: 'Días activos por semana', short: 'días', period: 'week', min: 1, max: 7, def: 3, step: 1 },
  minutes_per_week: { label: 'Minutos por semana', short: 'min', period: 'week', min: 10, max: 3000, def: 150, step: 10 },
  km_per_month: { label: 'Kilómetros por mes', short: 'km', period: 'month', min: 1, max: 3000, def: 50, step: 1 },
};

const monthly = (g) => GOAL_TYPES[g.type]?.period === 'month';
export const periodStart = (g, d) => (monthly(g) ? startOfMonth(new Date(d)) : startOfWeek(d));
export const nextPeriod = (g, s) => (monthly(g) ? addMonths(s, 1) : addDays(s, 7));
export const prevPeriod = (g, s) => (monthly(g) ? addMonths(s, -1) : addDays(s, -7));
export const periodKey = (g, s) => (monthly(g) ? 'M' : 'W') + dayKey(s);
export const periodNoun = (g, plural = false) => (monthly(g) ? (plural ? 'meses' : 'mes') : (plural ? 'semanas' : 'semana'));

export function periodLabel(g, s) {
  if (monthly(g)) return `${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  const e = addDays(s, 6);
  return `${fmtDate(s)} – ${fmtDate(e)}`;
}

export const countsForGoal = (g, w) =>
  g.activityFilter === 'any' || (Array.isArray(g.activityFilter) && g.activityFilter.includes(w.activityId));

export function periodValue(state, start, end) {
  const g = state.goal;
  const ws = state.workouts.filter((w) => {
    const t = new Date(w.startAt);
    return t >= start && t < end && countsForGoal(g, w);
  });
  if (g.type === 'days_per_week') return new Set(ws.map((w) => dayKey(w.startAt))).size;
  if (g.type === 'minutes_per_week') return Math.round(sum(ws, (w) => w.durationMin));
  return Math.round(sum(ws, (w) => w.distanceKm) * 10) / 10;
}

function earliestDate(state, now) {
  let first = now;
  if (state.profile?.createdAt) first = new Date(Math.min(first, new Date(state.profile.createdAt)));
  for (const w of state.workouts) {
    const t = new Date(w.startAt);
    if (t < first) first = t;
  }
  return first;
}

export function computeStreak(state, now = new Date()) {
  const g = state.goal;
  const curStart = periodStart(g, now);
  const curEnd = nextPeriod(g, curStart);
  const current = periodValue(state, curStart, curEnd);
  const curMet = current >= g.target;
  const firstStart = periodStart(g, earliestDate(state, now));

  // Periodos ya terminados, del más reciente al más antiguo
  const history = [];
  for (let s = prevPeriod(g, curStart); s >= firstStart; s = prevPeriod(g, s)) {
    const key = periodKey(g, s);
    const value = periodValue(state, s, nextPeriod(g, s));
    history.push({ key, start: s, value, met: value >= g.target, shielded: state.shieldUses.includes(key) });
  }

  let streak = curMet ? 1 : 0;
  for (const h of history) {
    if (h.met) streak++;
    else if (h.shielded) continue;
    else break;
  }

  let best = 0, run = 0;
  for (const h of [...history].reverse()) {
    if (h.met) { run++; best = Math.max(best, run); }
    else if (!h.shielded) run = 0;
  }
  best = Math.max(best, streak);

  // Escudo: solo para el último periodo cerrado, si se falló y antes había racha
  const last = history[0];
  const before = history[1];
  const canShield = last && !last.met && !last.shielded && before && (before.met || before.shielded) ? last.key : null;

  const daysLeft = Math.max(0, Math.ceil((curEnd - now) / 86400000));
  return { streak, best, current, target: g.target, curMet, curStart, curEnd, history, canShield, daysLeft };
}

// ---------- Mascota ----------
export function mascotMood(state, s, now = new Date()) {
  const today = dayKey(now);
  const workedToday = state.workouts.some((w) => dayKey(w.startAt) === today);
  if (workedToday && s.curMet) return 'party';
  if (workedToday || s.curMet) return 'happy';
  const lastT = state.workouts.reduce((m, w) => Math.max(m, new Date(w.startAt).getTime()), 0);
  const daysSince = lastT ? Math.floor((startOfDay(now) - startOfDay(lastT)) / 86400000) : Infinity;
  const remaining = s.target - s.current;
  const behind = state.goal.type === 'days_per_week' && remaining > s.daysLeft;
  if ((state.workouts.length && daysSince >= 3) || behind) return 'sad';
  const h = now.getHours();
  if (h >= 22 || h < 6) return 'sleepy';
  return 'normal';
}

const LINES = {
  party: ['¡Meta cumplida y encima entrenaste hoy! Estoy que ardo 🔥', '¡Eso es! Hoy brillamos los dos.'],
  happy: ['¡Qué buena energía! Sigamos así.', 'Me siento a tope gracias a ti.', 'Un día más, una chispa más.'],
  normal: ['¿Nos movemos un poquito hoy?', 'Diez minutos también cuentan.', 'Estoy listo cuando tú lo estés.'],
  sad: ['Te extraño en la pista… ¿volvemos?', 'Mi llama está bajita, ayúdame con un entreno.', 'No pasa nada, hoy es buen día para retomar.'],
  sleepy: ['Zzz… mañana entrenamos, ¿vale?', 'Descansar también es parte del plan.'],
};
export const mascotLine = (mood, seed = new Date().getDate()) => {
  const arr = LINES[mood] || LINES.normal;
  return arr[seed % arr.length];
};

// ---------- Recompensas ----------
const MILESTONES = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000];

export function syncRewards(state, s) {
  const out = { packs: 0, shields: 0 };
  const give = (key) => {
    if (state.awardedPeriods.includes(key)) return;
    state.awardedPeriods.push(key);
    state.packs++;
    out.packs++;
  };
  const metKeys = s.history.filter((h) => h.met).map((h) => h.key);
  if (s.curMet) metKeys.push(periodKey(state.goal, s.curStart));
  let periodAwards = state.awardedPeriods.filter((k) => /^[WM]/.test(k)).length;
  for (const k of metKeys) {
    if (state.awardedPeriods.includes(k)) continue;
    give(k);
    periodAwards++;
    if (periodAwards % 4 === 0 && state.goal.shields < 5) { state.goal.shields++; out.shields++; }
  }
  for (const m of MILESTONES) if (state.workouts.length >= m) give('N' + m);
  return out;
}

export function drawCard(rand = Math.random) {
  const entries = Object.entries(RARITY);
  const total = entries.reduce((a, [, r]) => a + r.weight, 0);
  let x = rand() * total, rarity = 'comun';
  for (const [k, r] of entries) { if ((x -= r.weight) < 0) { rarity = k; break; } }
  const pool = CARDS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(rand() * pool.length)];
}
