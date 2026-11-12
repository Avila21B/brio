// Datos locales: un documento JSON versionado en localStorage.
const KEY = 'brio.v1';
const VERSION = 1;

export const defaults = () => ({
  version: VERSION,
  profile: null,
  goal: { type: 'days_per_week', target: 3, activityFilter: 'any', shields: 2 },
  shieldUses: [],
  workouts: [],
  tags: [],
  foodLogs: [],
  customFoods: [],
  water: {},
  fasts: [],
  cards: [],
  packs: 0,
  awardedPeriods: [],
  settings: { theme: 'auto', fastProtocol: 16 },
});

let state = defaults();
let saveError = null;

function migrate(s) {
  const d = defaults();
  const out = { ...d, ...s, goal: { ...d.goal, ...(s.goal || {}) }, settings: { ...d.settings, ...(s.settings || {}) } };
  for (const k of ['shieldUses', 'workouts', 'tags', 'foodLogs', 'customFoods', 'fasts', 'cards', 'awardedPeriods']) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  if (typeof out.water !== 'object' || !out.water) out.water = {};
  out.version = VERSION;
  return out;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaults();
  } catch {
    state = defaults();
  }
  return state;
}

export const get = () => state;
export const lastSaveError = () => saveError;

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch (e) {
    saveError = e;
  }
  return !saveError;
}

export function update(fn) {
  fn(state);
  return save();
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !('workouts' in parsed)) {
    throw new Error('El archivo no parece una copia de Brío.');
  }
  state = migrate(parsed);
  save();
}

export function reset() {
  state = defaults();
  try { localStorage.removeItem(KEY); } catch { /* sin acceso */ }
}
