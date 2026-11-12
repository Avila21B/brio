// Arranque, router por hash y barra de navegación.
import * as store from './store.js';
import { $ } from './util.js';
import { setRerender, toast } from './ui.js';
import { computeStreak, syncRewards } from './logic/streak.js';
import * as onboarding from './views/onboarding.js';
import * as home from './views/home.js';
import * as log from './views/log.js';
import * as gps from './views/gps.js';
import * as gym from './views/gym.js';
import * as workout from './views/workout.js';
import * as goals from './views/goals.js';
import * as diet from './views/diet.js';
import * as cards from './views/cards.js';
import * as stats from './views/stats.js';
import * as settings from './views/settings.js';

const VIEWS = {
  onboarding, home, log, edit: log, gps, gym, workout, goals,
  diet, food: diet, fast: diet, cards, stats, calendar: stats, settings, tags: settings,
};
const NO_NAV = new Set(['onboarding', 'gps', 'gym', 'food', 'edit']);
const NAV = [
  ['home', '🏠', 'Hoy'],
  ['goals', '🔥', 'Racha'],
  ['log', '+', 'Registrar'],
  ['diet', '🥗', 'Comida'],
  ['stats', '📊', 'Progreso'],
];
const NAV_OWNER = { edit: 'log', workout: 'home', food: 'diet', fast: 'diet', calendar: 'stats', tags: 'stats', cards: 'home', settings: 'home' };

let cleanup = null;

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'home', args: parts.slice(1), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderNav(name) {
  const active = NAV_OWNER[name] || name;
  $('#nav').innerHTML = NAV.map(([id, ico, label]) => id === 'log'
    ? `<a href="#/log" aria-label="${label} entreno"><span class="fab" aria-hidden="true">${ico}</span></a>`
    : `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${ico}</span>${label}</a>`).join('');
}

export function applyTheme() {
  const t = store.get().settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function render(fromNav = false) {
  if (cleanup) { try { cleanup(); } catch { /* ignorar */ } cleanup = null; }
  const st = store.get();
  const r = parse();
  if (!st.profile && r.name !== 'onboarding') { location.replace('#/onboarding'); return; }
  if (st.profile && r.name === 'onboarding') { location.replace('#/home'); return; }

  if (st.profile) {
    const gained = syncRewards(st, computeStreak(st));
    if (gained.packs || gained.shields) {
      store.save();
      const parts = [];
      if (gained.packs) parts.push(gained.packs === 1 ? '¡Ganaste un sobre de cartas! 🎴' : `¡Ganaste ${gained.packs} sobres de cartas! 🎴`);
      if (gained.shields) parts.push('+1 escudo 🛡️');
      setTimeout(() => toast(parts.join(' ')), 400);
    }
  }

  const view = VIEWS[r.name] || home;
  document.body.classList.toggle('no-nav', NO_NAV.has(r.name));
  renderNav(r.name);
  const root = $('#view');
  const res = view.render(root, r);
  cleanup = typeof res === 'function' ? res : null;
  if (fromNav) { window.scrollTo(0, 0); root.focus({ preventScroll: true }); }
  if (store.lastSaveError()) toast('No se pudo guardar: el almacenamiento está lleno.');
}

store.load();
applyTheme();
setRerender(() => render(false));
window.addEventListener('hashchange', () => render(true));
render(true);

// Pide al navegador no borrar los datos aunque falte espacio (Chrome lo concede a apps instaladas).
navigator.storage?.persist?.().catch(() => { /* no soportado */ });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin SW */ });
}
