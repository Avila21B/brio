// S04 Seguimiento GPS. La sesión vive a nivel de módulo para sobrevivir a cambios de pantalla.
import { get } from '../store.js';
import { esc, fmtClock, fmtNum, haversineKm } from '../util.js';
import { activity, estimateKcal } from '../data/activities.js';
import { saveWorkout } from '../actions.js';
import { topbar, wireBack, go, toast, confirmDialog } from '../ui.js';
import { route } from '../ui/art.js';

let session = null; // { activityId, status, startAt, accMs, runningSince, points, km, watchId, error, wakeLock }

function elapsedMs(s) {
  return s.accMs + (s.status === 'running' ? Date.now() - s.runningSince : 0);
}

function onPosition(pos) {
  const s = session;
  if (!s) return;
  s.error = null;
  s.accuracy = pos.coords.accuracy;
  if (s.status !== 'running' || pos.coords.accuracy > 50) return;
  const p = [pos.coords.latitude, pos.coords.longitude, pos.timestamp];
  const last = s.points[s.points.length - 1];
  if (!last) { s.points.push(p); return; }
  const d = haversineKm(last, p);
  const dt = Math.max(1, (p[2] - last[2]) / 1000);
  if ((d * 1000) / dt > 50) return; // salto imposible
  if (d * 1000 < 8) return; // ruido
  s.km += d;
  s.points.push(p);
}

function onError(err) {
  if (!session) return;
  session.error = err.code === 1
    ? 'Permiso de ubicación denegado. Actívalo en los ajustes del navegador para medir la distancia.'
    : 'No hay señal GPS todavía. Sal a un lugar abierto.';
}

async function keepAwake() {
  try { session.wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* no soportado */ }
}

function start(activityId) {
  session = { activityId, status: 'running', startAt: new Date().toISOString(), accMs: 0, runningSince: Date.now(), points: [], km: 0, watchId: null, error: null };
  if (!('geolocation' in navigator)) session.error = 'Tu navegador no tiene GPS. Puedes registrar el entreno a mano.';
  else session.watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  keepAwake();
}

function stop() {
  if (!session) return;
  if (session.watchId != null) navigator.geolocation.clearWatch(session.watchId);
  session.wakeLock?.release?.();
  session = null;
}

export function render(root, r) {
  const a = activity(session?.activityId || r.args[0]);
  if (session && session.activityId !== a.id) { go(`#/gps/${session.activityId}`); return; }
  const weight = get().profile?.weightKg || 70;

  root.innerHTML = `${topbar(`${a.icon} ${esc(a.name)}`, { backHref: '#/log' })}
  <div class="stack">
    <div class="card stack">
      <div class="big-clock" id="clock" aria-live="off">00:00</div>
      <div class="gps-stats">
        <div><b id="km">0,00</b><span>km</span></div>
        <div><b id="pace">–</b><span>${a.id === 'run' || a.id === 'walk' || a.id === 'trail' || a.id === 'hike' ? 'min/km' : 'km/h'}</span></div>
        <div><b id="kcal">0</b><span>kcal</span></div>
      </div>
      <p id="gps-msg" class="small center muted" role="status"></p>
    </div>
    <div id="map"></div>
    <div class="row" id="ctrls"></div>
    <p class="xs muted center">Mantén la pantalla encendida: los navegadores pausan el GPS con la pantalla apagada.</p>
  </div>`;
  wireBack(root);

  const usePace = /run|walk|trail|hike/.test(a.id);
  const paint = () => {
    const ms = session ? elapsedMs(session) : 0;
    const km = session?.km || 0;
    root.querySelector('#clock').textContent = fmtClock(ms / 1000);
    root.querySelector('#km').textContent = fmtNum(km, 2);
    const min = ms / 60000;
    root.querySelector('#pace').textContent = km > 0.05
      ? (usePace ? fmtClock((min / km) * 60) : fmtNum(km / (min / 60), 1))
      : '–';
    root.querySelector('#kcal').textContent = fmtNum(estimateKcal(a.id, min, weight));
    const msg = root.querySelector('#gps-msg');
    if (!session) msg.textContent = 'Pulsa Empezar cuando estés listo.';
    else if (session.error) { msg.textContent = session.error; msg.style.color = 'var(--danger)'; }
    else if (session.status === 'paused') { msg.textContent = 'En pausa'; msg.style.color = ''; }
    else { msg.textContent = session.accuracy ? `GPS activo · precisión ±${Math.round(session.accuracy)} m` : 'Buscando señal GPS…'; msg.style.color = ''; }
    const map = root.querySelector('#map');
    const pts = session?.points || [];
    map.innerHTML = pts.length > 1 ? route(pts) : '';
  };

  const controls = () => {
    const c = root.querySelector('#ctrls');
    if (!session) c.innerHTML = '<button class="btn btn-primary btn-lg grow" id="g-start">▶ Empezar</button>';
    else if (session.status === 'running') c.innerHTML = '<button class="btn btn-secondary btn-lg grow" id="g-pause">⏸ Pausa</button><button class="btn btn-primary btn-lg grow" id="g-finish">■ Terminar</button>';
    else c.innerHTML = '<button class="btn btn-danger btn-lg" id="g-discard">Descartar</button><button class="btn btn-secondary btn-lg grow" id="g-resume">▶ Seguir</button><button class="btn btn-primary btn-lg grow" id="g-finish">■ Terminar</button>';
    c.querySelector('#g-start')?.addEventListener('click', () => { start(a.id); controls(); paint(); });
    c.querySelector('#g-pause')?.addEventListener('click', () => {
      session.accMs = elapsedMs(session); session.status = 'paused'; controls(); paint();
    });
    c.querySelector('#g-resume')?.addEventListener('click', () => {
      session.status = 'running'; session.runningSince = Date.now(); controls(); paint();
    });
    c.querySelector('#g-discard')?.addEventListener('click', async () => {
      if (await confirmDialog('¿Descartar este entreno?', { ok: 'Descartar', danger: true })) { stop(); go('#/log'); }
    });
    c.querySelector('#g-finish')?.addEventListener('click', finish);
  };

  async function finish() {
    const ms = elapsedMs(session);
    if (ms < 60000 && !(await confirmDialog('Duró menos de un minuto. ¿Guardarlo igual?', { ok: 'Guardar' }))) return;
    const pts = session.points;
    const step = Math.ceil(pts.length / 1500) || 1; // limitar tamaño
    const routePts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]);
    const minutes = Math.max(1, Math.round(ms / 60000));
    const id = saveWorkout({
      activityId: a.id,
      startAt: session.startAt,
      durationMin: minutes,
      distanceKm: Math.round(session.km * 100) / 100 || undefined,
      kcal: estimateKcal(a.id, minutes, weight),
      route: routePts.length > 1 ? routePts : undefined,
      source: 'gps',
    });
    stop();
    toast('¡Entreno guardado! 🔥');
    go(`#/workout/${id}`);
  }

  controls();
  paint();
  const timer = setInterval(paint, 1000);
  const warn = (e) => { if (session) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', warn);
  const onVis = () => { if (document.visibilityState === 'visible' && session?.status === 'running') keepAwake(); };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    clearInterval(timer);
    window.removeEventListener('beforeunload', warn);
    document.removeEventListener('visibilitychange', onVis);
  };
}

export const activeSession = () => session;
