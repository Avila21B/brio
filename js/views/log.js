// S03 Registrar entreno: selector de actividad y formulario (nuevo o editar).
import { get } from '../store.js';
import { esc, normalize, toLocalInput, fmtNum } from '../util.js';
import { ACTIVITIES, CATEGORIES, activity, estimateKcal } from '../data/activities.js';
import { countsForGoal, computeStreak, periodNoun } from '../logic/streak.js';
import { saveWorkout } from '../actions.js';
import { topbar, wireBack, go, toast } from '../ui.js';

let pickerCat = 'all';

export function render(root, r) {
  if (r.name === 'edit') return form(root, get().workouts.find((w) => w.id === r.args[0]));
  if (r.args[0]) return form(root, null, r.args[0]);
  return picker(root);
}

function recentActivities(st) {
  const seen = [];
  for (let i = st.workouts.length - 1; i >= 0 && seen.length < 6; i--) {
    const id = st.workouts[i].activityId;
    if (!seen.includes(id)) seen.push(id);
  }
  return seen.map(activity);
}

const tile = (a) => `<a class="act" href="#/log/${a.id}"><span class="e" aria-hidden="true">${a.icon}</span>${esc(a.name)}</a>`;

function picker(root) {
  const st = get();
  const recent = recentActivities(st);
  root.innerHTML = `${topbar('¿Qué hiciste?')}
  <div class="stack">
    <label class="field"><span class="sr-only">Buscar actividad</span>
      <input class="input" id="q" type="search" placeholder="🔎 Buscar entre ${ACTIVITIES.length} actividades" autocomplete="off"></label>
    <div class="chips scroll" role="group" aria-label="Categorías">
      <button class="chip" data-cat="all" aria-pressed="${pickerCat === 'all'}">Todas</button>
      ${CATEGORIES.map(([k, l]) => `<button class="chip" data-cat="${k}" aria-pressed="${pickerCat === k}">${l}</button>`).join('')}
    </div>
    ${recent.length ? `<section id="recent" class="stack-s"><h3>Recientes</h3><div class="act-grid">${recent.map(tile).join('')}</div></section>` : ''}
    <section class="stack-s"><h3 id="grid-title">Todas</h3><div class="act-grid" id="grid"></div></section>
  </div>`;

  const grid = root.querySelector('#grid'), q = root.querySelector('#q');
  const paint = () => {
    const term = normalize(q.value.trim());
    const list = ACTIVITIES.filter((a) => (pickerCat === 'all' || a.category === pickerCat) && (!term || normalize(a.name).includes(term)));
    grid.innerHTML = list.length ? list.map(tile).join('') : `<div class="empty" style="grid-column:1/-1"><p>No hay resultados. Prueba con “Otro ejercicio”.</p>${tile(activity('other'))}</div>`;
    root.querySelector('#grid-title').textContent = term ? `Resultados (${list.length})` : (CATEGORIES.find(([k]) => k === pickerCat)?.[1] || 'Todas');
    const rec = root.querySelector('#recent');
    if (rec) rec.hidden = !!term || pickerCat !== 'all';
  };
  q.addEventListener('input', paint);
  root.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    pickerCat = b.dataset.cat;
    root.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    paint();
  }));
  paint();
}

function form(root, existing, activityId) {
  const st = get();
  if (root && existing === undefined) {
    root.innerHTML = `${topbar('Entreno', { backHref: '#/home' })}<div class="empty"><span class="big">🤷</span><p>Este entreno ya no existe.</p></div>`;
    wireBack(root);
    return;
  }
  const a = activity(existing ? existing.activityId : activityId);
  const w = existing || { activityId: a.id, startAt: new Date().toISOString(), durationMin: 30, tagIds: [], note: '' };
  const weight = st.profile?.weightKg || 70;
  const counts = countsForGoal(st.goal, { activityId: a.id });
  const selTags = new Set(w.tagIds || []);

  root.innerHTML = `${topbar(existing ? 'Editar entreno' : 'Nuevo entreno', { backHref: existing ? `#/workout/${existing.id}` : '#/log' })}
  <form class="stack" id="f" novalidate>
    <div class="card row">
      <span class="list-ico" style="font-size:30px">${a.icon}</span>
      <div class="grow"><h2 class="ellipsis">${esc(a.name)}</h2>
        ${counts ? '<span class="pill ok">Cuenta para tu meta</span>' : `<span class="pill warn">No cuenta para tu meta actual</span>`}</div>
      ${existing ? '' : '<a class="btn btn-sm btn-secondary" href="#/log">Cambiar</a>'}
    </div>
    ${!existing && a.gps ? `<a class="btn btn-primary btn-lg btn-block" href="#/gps/${a.id}">📍 Iniciar con GPS</a><p class="center small muted">o regístralo a mano:</p>` : ''}
    ${!existing && a.id === 'gym' ? `<a class="btn btn-primary btn-lg btn-block" href="#/gym">🏋️ Registrar series y pesos</a><p class="center small muted">o solo el tiempo:</p>` : ''}
    <label class="field"><span>Fecha y hora</span><input class="input" type="datetime-local" id="when" required value="${toLocalInput(w.startAt)}" max="${toLocalInput(new Date())}"></label>
    <div class="field"><span id="dur-l">Duración (minutos)</span>
      <input class="input" type="number" id="dur" inputmode="numeric" min="1" max="1440" step="1" required aria-labelledby="dur-l" value="${Math.round(w.durationMin) || ''}">
      <div class="chips">${[15, 30, 45, 60, 90].map((m) => `<button type="button" class="chip" data-min="${m}">${m} min</button>`).join('')}</div></div>
    ${a.hasDistance || w.distanceKm ? `<label class="field"><span>Distancia (km)</span><input class="input" type="number" id="dist" inputmode="decimal" min="0" max="1000" step="0.01" value="${w.distanceKm ?? ''}" placeholder="Opcional"></label>` : ''}
    <label class="field"><span>Calorías quemadas</span><input class="input" type="number" id="kcal" inputmode="numeric" min="0" max="10000" value="${existing && existing.kcalManual ? existing.kcal : ''}" placeholder="≈ ${estimateKcal(a.id, w.durationMin, weight)} kcal (estimado)"></label>
    <div class="field"><span>Etiquetas (zapatillas, raqueta, gimnasio…)</span>
      <div class="chips" id="tags">${st.tags.map((t) => `<button type="button" class="chip" data-tag="${t.id}" aria-pressed="${selTags.has(t.id)}">${esc(t.name)}</button>`).join('')}
      <a class="chip" href="#/tags" style="text-decoration:none;color:inherit">+ Nueva</a></div></div>
    <label class="field"><span>Nota</span><textarea class="input" id="note" maxlength="500" placeholder="¿Cómo te sentiste?">${esc(w.note || '')}</textarea></label>
    <p id="err" class="small" style="color:var(--danger)" role="alert"></p>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar entreno</button>
  </form>`;
  wireBack(root);

  const $ = (id) => root.querySelector(id);
  const dur = $('#dur'), kcal = $('#kcal');
  const updateEstimate = () => { kcal.placeholder = `≈ ${estimateKcal(a.id, Number(dur.value) || 0, weight)} kcal (estimado)`; };
  dur.addEventListener('input', updateEstimate);
  root.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => { dur.value = b.dataset.min; updateEstimate(); }));
  root.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.tag;
    if (selTags.has(id)) selTags.delete(id); else selTags.add(id);
    b.setAttribute('aria-pressed', selTags.has(id));
  }));

  $('#f').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#err');
    const when = new Date($('#when').value);
    const minutes = Number(dur.value);
    const dist = $('#dist') ? Number($('#dist').value || 0) : (w.distanceKm || 0);
    if (Number.isNaN(when.getTime())) { err.textContent = 'Elige una fecha válida.'; return; }
    if (when.getTime() > Date.now() + 5 * 60000) { err.textContent = 'La fecha no puede estar en el futuro.'; return; }
    if (!(minutes > 0 && minutes <= 1440)) { err.textContent = 'La duración debe estar entre 1 y 1440 minutos.'; dur.focus(); return; }
    if (dist < 0 || dist > 1000) { err.textContent = 'Revisa la distancia.'; return; }
    const manual = kcal.value !== '';
    const before = computeStreak(get()).streak;
    const id = saveWorkout({
      ...(existing || {}),
      activityId: a.id,
      startAt: when.toISOString(),
      durationMin: minutes,
      distanceKm: dist || undefined,
      kcal: manual ? Math.max(0, Math.round(Number(kcal.value))) : estimateKcal(a.id, minutes, weight),
      kcalManual: manual,
      tagIds: [...selTags],
      note: $('#note').value.trim(),
      source: existing?.source || 'manual',
    });
    const after = computeStreak(get());
    if (existing) { toast('Cambios guardados'); go(`#/workout/${id}`); return; }
    toast(after.streak > before ? `¡Racha de ${after.streak} ${periodNoun(get().goal, after.streak !== 1)}! 🔥` : '¡Entreno guardado! 💪');
    go('#/home');
  });
}
