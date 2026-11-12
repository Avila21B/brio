// S06 Gimnasio: ejercicios con series × repeticiones × peso.
import { get } from '../store.js';
import { esc, normalize, fmtNum } from '../util.js';
import { EXERCISES, MUSCLES, exercise } from '../data/exercises.js';
import { estimateKcal } from '../data/activities.js';
import { saveWorkout } from '../actions.js';
import { topbar, wireBack, go, toast, sheet, confirmDialog } from '../ui.js';

let draft = null; // { startAt, items: [{ exerciseId, sets: [{ reps, weightKg }] }] }
const newDraft = () => ({ startAt: new Date().toISOString(), items: [] });

export function render(root) {
  if (!draft) draft = newDraft();
  const elapsed = Math.max(1, Math.round((Date.now() - new Date(draft.startAt)) / 60000));
  const volume = draft.items.reduce((a, it) => a + it.sets.reduce((b, s) => b + (s.reps || 0) * (s.weightKg || 0), 0), 0);

  root.innerHTML = `${topbar('🏋️ Gimnasio', { backHref: '#/log/gym' })}
  <div class="stack">
    <div class="stat-grid">
      <div class="stat"><b>${draft.items.length}</b><span>ejercicios</span></div>
      <div class="stat"><b id="vol">${fmtNum(volume)} kg</b><span>volumen total</span></div>
    </div>
    <div id="items" class="stack">
      ${draft.items.length ? draft.items.map((it, i) => {
        const ex = exercise(it.exerciseId);
        return `<div class="card stack-s" data-i="${i}">
          <div class="row between"><div class="grow"><h3 class="ellipsis">${esc(ex.name)}</h3><span class="xs muted">${esc(ex.muscle)} · ${esc(ex.equipment)}</span></div>
            <button class="icon-btn" data-rm="${i}" aria-label="Quitar ${esc(ex.name)}">🗑️</button></div>
          ${it.sets.map((s, j) => `<div class="row">
            <span class="small bold muted" style="width:44px">Serie ${j + 1}</span>
            <label class="grow"><span class="sr-only">Repeticiones serie ${j + 1}</span><input class="input" type="number" inputmode="numeric" min="0" max="999" data-reps="${i}.${j}" value="${s.reps ?? ''}" placeholder="reps"></label>
            <span class="muted">×</span>
            <label class="grow"><span class="sr-only">Peso serie ${j + 1}</span><input class="input" type="number" inputmode="decimal" min="0" max="999" step="0.5" data-kg="${i}.${j}" value="${s.weightKg ?? ''}" placeholder="kg"></label>
            <button class="icon-btn" data-rmset="${i}.${j}" aria-label="Quitar serie ${j + 1}">−</button></div>`).join('')}
          <button class="btn btn-sm btn-secondary" data-addset="${i}">+ Serie</button>
        </div>`;
      }).join('') : '<div class="empty"><span class="big">🏋️</span><p>Añade tu primer ejercicio.</p></div>'}
    </div>
    <button class="btn btn-secondary btn-lg btn-block" id="add">+ Añadir ejercicio</button>
    <label class="field"><span>Duración (minutos)</span><input class="input" id="dur" type="number" inputmode="numeric" min="1" max="600" value="${Math.min(elapsed, 600)}"></label>
    <p id="err" class="small" role="alert" style="color:var(--danger)"></p>
    <div class="row"><button class="btn btn-danger" id="discard">Descartar</button>
      <button class="btn btn-primary btn-lg grow" id="save">Guardar sesión</button></div>
  </div>`;
  wireBack(root);

  const recalc = () => {
    const v = draft.items.reduce((a, it) => a + it.sets.reduce((b, s) => b + (s.reps || 0) * (s.weightKg || 0), 0), 0);
    root.querySelector('#vol').textContent = `${fmtNum(v)} kg`;
  };
  root.querySelectorAll('[data-reps]').forEach((inp) => inp.addEventListener('input', () => {
    const [i, j] = inp.dataset.reps.split('.').map(Number);
    draft.items[i].sets[j].reps = inp.value === '' ? null : Number(inp.value); recalc();
  }));
  root.querySelectorAll('[data-kg]').forEach((inp) => inp.addEventListener('input', () => {
    const [i, j] = inp.dataset.kg.split('.').map(Number);
    draft.items[i].sets[j].weightKg = inp.value === '' ? null : Number(inp.value); recalc();
  }));
  root.querySelectorAll('[data-addset]').forEach((b) => b.addEventListener('click', () => {
    const it = draft.items[Number(b.dataset.addset)];
    const last = it.sets[it.sets.length - 1] || {};
    it.sets.push({ reps: last.reps ?? null, weightKg: last.weightKg ?? null });
    render(root);
  }));
  root.querySelectorAll('[data-rmset]').forEach((b) => b.addEventListener('click', () => {
    const [i, j] = b.dataset.rmset.split('.').map(Number);
    draft.items[i].sets.splice(j, 1);
    if (!draft.items[i].sets.length) draft.items.splice(i, 1);
    render(root);
  }));
  root.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { draft.items.splice(Number(b.dataset.rm), 1); render(root); }));
  root.querySelector('#add').addEventListener('click', () => pickExercise(() => render(root)));
  root.querySelector('#discard').addEventListener('click', async () => {
    if (!draft.items.length || await confirmDialog('¿Descartar esta sesión?', { ok: 'Descartar', danger: true })) { draft = null; go('#/log'); }
  });
  root.querySelector('#save').addEventListener('click', () => {
    const minutes = Number(root.querySelector('#dur').value);
    const err = root.querySelector('#err');
    if (!(minutes > 0 && minutes <= 600)) { err.textContent = 'La duración debe estar entre 1 y 600 minutos.'; return; }
    const sets = draft.items.flatMap((it) => it.sets.filter((s) => s.reps > 0).map((s) => ({ exerciseId: it.exerciseId, reps: s.reps, weightKg: s.weightKg || 0 })));
    if (!sets.length) { err.textContent = 'Añade al menos una serie con repeticiones.'; return; }
    const id = saveWorkout({
      activityId: 'gym', startAt: draft.startAt, durationMin: minutes,
      kcal: estimateKcal('gym', minutes, get().profile?.weightKg), sets, source: 'gym',
    });
    draft = null;
    toast('¡Sesión guardada! 💪');
    go(`#/workout/${id}`);
  });
}

function pickExercise(done) {
  let muscle = 'all';
  sheet(`<div class="stack"><h2>Añadir ejercicio</h2>
    <input class="input" id="eq" type="search" placeholder="🔎 Buscar ejercicio" aria-label="Buscar ejercicio" autofocus>
    <div class="chips scroll"><button class="chip" data-m="all" aria-pressed="true">Todos</button>
      ${MUSCLES.map((m) => `<button class="chip" data-m="${esc(m)}" aria-pressed="false">${esc(m)}</button>`).join('')}</div>
    <div class="list" id="el"></div></div>`, {
    label: 'Añadir ejercicio',
    onMount(box, close) {
      const list = box.querySelector('#el'), q = box.querySelector('#eq');
      const paint = () => {
        const t = normalize(q.value.trim());
        const items = EXERCISES.filter((e) => (muscle === 'all' || e.muscle === muscle) && (!t || normalize(e.name).includes(t)));
        list.innerHTML = items.map((e) => `<button class="list-item" data-ex="${e.id}"><span class="grow"><b>${esc(e.name)}</b><br><span class="xs muted">${esc(e.muscle)} · ${esc(e.equipment)}</span></span><span aria-hidden="true">＋</span></button>`).join('')
          || '<p class="muted center">Sin resultados</p>';
        list.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => {
          draft.items.push({ exerciseId: b.dataset.ex, sets: [{ reps: null, weightKg: null }] });
          close(); done();
        }));
      };
      q.addEventListener('input', paint);
      box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
        muscle = b.dataset.m;
        box.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        paint();
      }));
      paint();
    },
  });
}
