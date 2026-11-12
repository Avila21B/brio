// S07 Metas y racha: racha actual, escudos, historial y editor de meta.
import { get, update } from '../store.js';
import { esc, clamp, fmtNum } from '../util.js';
import { computeStreak, GOAL_TYPES, periodLabel, periodNoun } from '../logic/streak.js';
import { ACTIVITIES, CATEGORIES, activity } from '../data/activities.js';
import { topbar, rerender, toast, sheet, confirmDialog } from '../ui.js';

let editing = null; // copia temporal de la meta mientras se edita

export function render(root) {
  const st = get();
  const s = computeStreak(st);
  const g = st.goal;
  const gt = GOAL_TYPES[g.type];
  if (!editing) editing = { ...g, activityFilter: g.activityFilter === 'any' ? 'any' : [...g.activityFilter] };
  const e = editing;
  const egt = GOAL_TYPES[e.type];

  // Racha que se salvaría con el escudo
  let saved = s.curMet ? 1 : 0;
  for (const h of s.history.slice(1)) { if (h.met) saved++; else if (!h.shielded) break; }

  const recent = s.history.slice(0, 11).reverse();
  const dots = [...recent.map((h) => ({ ...h, cur: false })), { key: 'cur', start: s.curStart, value: s.current, met: s.curMet, shielded: false, cur: true }];

  const filterTxt = e.activityFilter === 'any' ? 'Cualquier ejercicio' : `${e.activityFilter.length} actividad${e.activityFilter.length === 1 ? '' : 'es'}`;
  const dirty = JSON.stringify(e) !== JSON.stringify(g);

  root.innerHTML = `${topbar('Tu racha')}
  <div class="stack">
    <div class="card center stack-s">
      <div class="streak-num" style="font-size:64px">${s.streak}</div>
      <p class="bold">${s.streak === 1 ? periodNoun(g) : periodNoun(g, true)} cumpliendo tu meta sin fallar</p>
      <div class="row" style="justify-content:center"><span class="pill">🏆 Mejor: ${s.best}</span><span class="pill shield">🛡️ ${g.shields} escudo${g.shields === 1 ? '' : 's'}</span></div>
    </div>

    ${s.canShield ? `<div class="card stack-s" style="border-color:var(--shield)">
      <h3>⚠ No llegaste a la meta (${periodLabel(g, s.history[0].start)})</h3>
      <p class="small">Usa un escudo para no perder tu racha de <b>${saved}</b>. Ideal para semanas de viaje, enfermedad o regla.</p>
      <button class="btn btn-shield" id="shield" ${g.shields ? '' : 'disabled'}>🛡️ Usar escudo (${g.shields})</button>
      ${g.shields ? '' : '<p class="xs muted">Sin escudos. Ganas uno cada 4 periodos cumplidos.</p>'}
    </div>` : ''}

    <div class="card stack-s">
      <div class="row between"><h3>${periodNoun(g) === 'semana' ? 'Esta' : 'Este'} ${periodNoun(g)}</h3><span class="small muted">${periodLabel(g, s.curStart)}</span></div>
      <div class="row between small"><b>${fmtNum(s.current, s.current % 1 ? 1 : 0)} / ${s.target} ${gt.short}</b>
        <span class="muted">${s.curMet ? '✓ cumplida' : `quedan ${s.daysLeft} días`}</span></div>
      <div class="progress"><i style="width:${Math.min(100, (s.current / s.target) * 100)}%"></i></div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px">Historial</h3>
      <div style="display:grid;grid-template-columns:repeat(${dots.length},minmax(0,1fr));gap:2px">${dots.map((h) => `
        <div class="center" title="${periodLabel(g, h.start)}: ${fmtNum(h.value, h.value % 1 ? 1 : 0)} ${gt.short}">
          <div style="font-size:18px">${h.cur ? (h.met ? '🔥' : '⏳') : h.met ? '🔥' : h.shielded ? '🛡️' : '⚪'}</div>
          <div class="muted" style="font-size:9px;font-weight:700">${h.start.getDate()}/${h.start.getMonth() + 1}</div></div>`).join('')}</div>
      <p class="xs muted" style="margin-top:8px">🔥 cumplida · 🛡️ protegida · ⚪ no cumplida · ⏳ en curso</p>
    </div>

    <form class="card stack" id="gf">
      <h3>Editar meta</h3>
      <div class="seg" role="group" aria-label="Tipo de meta">
        ${Object.entries(GOAL_TYPES).map(([k, v]) => `<button type="button" data-type="${k}" aria-pressed="${e.type === k}">${v.short}/${v.period === 'month' ? 'mes' : 'sem'}</button>`).join('')}
      </div>
      <p class="small muted">${egt.label}</p>
      <div class="stepper"><button type="button" class="icon-btn" data-d="-1" aria-label="Menos">−</button>
        <label><span class="sr-only">Objetivo</span><input class="input center bold" id="target" type="number" inputmode="numeric" min="${egt.min}" max="${egt.max}" value="${e.target}" style="width:110px;font-size:24px"></label>
        <button type="button" class="icon-btn" data-d="1" aria-label="Más">+</button></div>
      <div class="field"><span>¿Qué ejercicios cuentan?</span>
        <div class="row between"><b>${filterTxt}</b><button type="button" class="btn btn-sm btn-secondary" id="filter">Elegir</button></div>
        ${e.activityFilter !== 'any' ? `<div class="chips">${e.activityFilter.slice(0, 12).map((id) => `<span class="pill">${activity(id).icon} ${esc(activity(id).name)}</span>`).join('')}</div>` : ''}
      </div>
      <p class="xs muted">Cambiar la meta recalcula tu racha con la nueva regla.</p>
      <div class="row">${dirty ? '<button type="button" class="btn btn-secondary grow" id="cancel">Deshacer</button>' : ''}
      <button class="btn btn-primary grow" type="submit" ${dirty ? '' : 'disabled'}>Guardar meta</button></div>
    </form>
  </div>`;

  root.querySelector('#shield')?.addEventListener('click', async () => {
    if (!(await confirmDialog(`¿Usar 1 escudo para proteger ${periodLabel(g, s.history[0].start)}?`, { ok: 'Usar escudo' }))) return;
    update((x) => { x.shieldUses.push(s.canShield); x.goal.shields--; });
    editing = null;
    toast('🛡️ ¡Racha protegida!');
    rerender();
  });

  root.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
    e.type = b.dataset.type; e.target = GOAL_TYPES[e.type].def; render(root);
  }));
  const tInput = root.querySelector('#target');
  tInput.addEventListener('change', () => { e.target = clamp(Math.round(Number(tInput.value) || egt.def), egt.min, egt.max); render(root); });
  root.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
    const step = e.type === 'days_per_week' ? 1 : e.type === 'minutes_per_week' ? 10 : 5;
    e.target = clamp(e.target + Number(b.dataset.d) * step, egt.min, egt.max); render(root);
  }));
  root.querySelector('#filter').addEventListener('click', () => pickFilter(e, () => render(root)));
  root.querySelector('#cancel')?.addEventListener('click', () => { editing = null; render(root); });
  root.querySelector('#gf').addEventListener('submit', (ev) => {
    ev.preventDefault();
    e.target = clamp(Math.round(Number(tInput.value) || egt.def), egt.min, egt.max);
    update((x) => { x.goal = { ...x.goal, type: e.type, target: e.target, activityFilter: e.activityFilter }; });
    editing = null;
    toast('Meta actualizada');
    rerender();
  });
}

function pickFilter(e, done) {
  const sel = new Set(e.activityFilter === 'any' ? [] : e.activityFilter);
  sheet(`<div class="stack"><h2>Ejercicios que cuentan</h2>
    <button class="option" id="any" aria-pressed="${sel.size === 0}"><span class="e">✨</span>Cualquier ejercicio</button>
    ${CATEGORIES.map(([k, l]) => `<div class="stack-s"><h3>${l}</h3><div class="chips">${ACTIVITIES.filter((a) => a.category === k)
      .map((a) => `<button class="chip" data-a="${a.id}" aria-pressed="${sel.has(a.id)}">${a.icon} ${esc(a.name)}</button>`).join('')}</div></div>`).join('')}
    <button class="btn btn-primary btn-block" id="ok" style="position:sticky;bottom:0">Listo</button></div>`, {
    label: 'Elegir ejercicios',
    onMount(box, close) {
      const anyBtn = box.querySelector('#any');
      box.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
        if (sel.has(b.dataset.a)) sel.delete(b.dataset.a); else sel.add(b.dataset.a);
        b.setAttribute('aria-pressed', sel.has(b.dataset.a));
        anyBtn.setAttribute('aria-pressed', sel.size === 0);
      }));
      anyBtn.addEventListener('click', () => {
        sel.clear();
        box.querySelectorAll('[data-a]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        anyBtn.setAttribute('aria-pressed', 'true');
      });
      box.querySelector('#ok').addEventListener('click', () => {
        e.activityFilter = sel.size ? [...sel] : 'any';
        close(); done();
      });
    },
  });
}
