// S05 Detalle del entreno.
import { get } from '../store.js';
import { esc, fmtDate, fmtTime, fmtDur, fmtNum, fmtClock } from '../util.js';
import { activity } from '../data/activities.js';
import { exercise } from '../data/exercises.js';
import { deleteWorkout } from '../actions.js';
import { topbar, wireBack, go, toast, confirmDialog } from '../ui.js';
import { route } from '../ui/art.js';

export function render(root, r) {
  const st = get();
  const w = st.workouts.find((x) => x.id === r.args[0]);
  if (!w) {
    root.innerHTML = `${topbar('Entreno', { backHref: '#/home' })}<div class="empty"><span class="big">🤷</span><p>Este entreno ya no existe.</p><a class="btn btn-primary" href="#/home">Ir al inicio</a></div>`;
    wireBack(root);
    return;
  }
  const a = activity(w.activityId);
  const pace = w.distanceKm > 0 ? (/run|walk|trail|hike/.test(a.id) ? `${fmtClock((w.durationMin / w.distanceKm) * 60)} /km` : `${fmtNum(w.distanceKm / (w.durationMin / 60), 1)} km/h`) : null;
  const tags = (w.tagIds || []).map((id) => st.tags.find((t) => t.id === id)).filter(Boolean);

  const groups = [];
  for (const s of w.sets || []) {
    let g = groups[groups.length - 1];
    if (!g || g.exerciseId !== s.exerciseId) groups.push(g = { exerciseId: s.exerciseId, sets: [] });
    g.sets.push(s);
  }
  const volume = (w.sets || []).reduce((acc, s) => acc + s.reps * (s.weightKg || 0), 0);

  root.innerHTML = `${topbar('', { backHref: '#/home', right: `<a class="btn btn-sm btn-secondary" href="#/edit/${w.id}">Editar</a>` })}
  <div class="stack">
    <div class="row"><span class="list-ico" style="font-size:32px;width:60px;height:60px">${a.icon}</span>
      <div class="grow"><h1 class="ellipsis">${esc(a.name)}</h1>
      <p class="muted small">${fmtDate(w.startAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${fmtTime(w.startAt)}</p></div></div>
    <div class="stat-grid">
      <div class="stat"><b>${fmtDur(w.durationMin)}</b><span>duración</span></div>
      <div class="stat"><b>${fmtNum(w.kcal)}</b><span>kcal</span></div>
      ${w.distanceKm ? `<div class="stat"><b>${fmtNum(w.distanceKm, 2)} km</b><span>distancia</span></div>` : ''}
      ${pace ? `<div class="stat"><b>${pace}</b><span>${/\/km/.test(pace) ? 'ritmo' : 'velocidad'}</span></div>` : ''}
      ${volume ? `<div class="stat"><b>${fmtNum(volume)} kg</b><span>volumen</span></div>` : ''}
    </div>
    ${w.route ? route(w.route) : ''}
    ${groups.length ? `<div class="card"><h3 style="margin-bottom:8px">Series</h3><div class="list">${groups.map((g) => `
      <div class="list-item" style="cursor:default"><span class="grow"><b>${esc(exercise(g.exerciseId).name)}</b><br>
      <span class="small muted">${g.sets.map((s) => `${s.reps}×${fmtNum(s.weightKg, s.weightKg % 1 ? 1 : 0)} kg`).join(' · ')}</span></span></div>`).join('')}</div></div>` : ''}
    ${tags.length ? `<div class="chips">${tags.map((t) => `<span class="pill">🏷️ ${esc(t.name)}</span>`).join('')}</div>` : ''}
    ${w.note ? `<div class="card soft"><p>${esc(w.note)}</p></div>` : ''}
    <p class="xs muted">Registrado ${w.source === 'gps' ? 'con GPS' : w.source === 'gym' ? 'en modo gimnasio' : 'a mano'}${w.kcalManual ? '' : ' · calorías estimadas'}</p>
    <button class="btn btn-danger btn-block" id="del">Eliminar entreno</button>
  </div>`;
  wireBack(root);
  root.querySelector('#del').addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar este entreno? No se puede deshacer.', { ok: 'Eliminar', danger: true }))) return;
    deleteWorkout(w.id);
    toast('Entreno eliminado');
    go('#/home');
  });
}
