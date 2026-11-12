// S01 Onboarding: nombre, cuerpo, meta de ejercicio, calorías.
import { update } from '../store.js';
import { esc, clamp } from '../util.js';
import { go } from '../ui.js';
import { mascot } from '../ui/art.js';
import { GOAL_TYPES } from '../logic/streak.js';
import { suggestedGoal, tdee } from '../logic/nutrition.js';

const draft = {
  step: 0, name: '', sex: '', birthYear: 1998, heightCm: 165, weightKg: 65,
  goalType: 'days_per_week', target: 3, deficit: 500, calorieGoal: null, waterGoalMl: 2000,
};
const STEPS = 4;

export function render(root) {
  const d = draft;
  const steps = `<div class="steps" aria-label="Paso ${d.step + 1} de ${STEPS}">${Array.from({ length: STEPS }, (_, i) => `<i class="${i <= d.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '', canNext = true;

  if (d.step === 0) {
    body = `<div class="stack center">
      <div style="width:150px;margin:0 auto">${mascot('happy')}</div>
      <h1>¡Hola! Soy Chispi</h1>
      <p class="muted">Cuido tu racha de ejercicio, tus calorías y tu agua. Todo gratis y guardado solo en tu teléfono.</p>
      <label class="field" style="text-align:left"><span>¿Cómo te llamo?</span>
        <input class="input" id="o-name" maxlength="40" autocomplete="given-name" value="${esc(d.name)}" placeholder="Tu nombre" autofocus></label>
    </div>`;
    canNext = d.name.trim().length > 0;
  } else if (d.step === 1) {
    const sexOpt = (v, l, e) => `<button class="option" data-sex="${v}" aria-pressed="${d.sex === v}"><span class="e">${e}</span>${l}</button>`;
    body = `<div class="stack">
      <h1>Sobre ti</h1><p class="muted">Lo uso solo para estimar calorías.</p>
      <div class="stack-s">${sexOpt('f', 'Mujer', '👩')}${sexOpt('m', 'Hombre', '👨')}${sexOpt('x', 'Prefiero no decirlo', '🙂')}</div>
      <div class="fields-2">
        <label class="field"><span>Año de nacimiento</span><input class="input" id="o-year" type="number" inputmode="numeric" min="1920" max="${new Date().getFullYear() - 10}" value="${d.birthYear}"></label>
        <label class="field"><span>Altura (cm)</span><input class="input" id="o-h" type="number" inputmode="numeric" min="100" max="250" value="${d.heightCm}"></label>
        <label class="field"><span>Peso (kg)</span><input class="input" id="o-w" type="number" inputmode="decimal" min="25" max="350" step="0.1" value="${d.weightKg}"></label>
      </div></div>`;
    canNext = !!d.sex;
  } else if (d.step === 2) {
    const gt = GOAL_TYPES[d.goalType];
    const opt = (k, e, desc) => `<button class="option" data-goal="${k}" aria-pressed="${d.goalType === k}"><span class="e">${e}</span>
      <span class="grow"><b>${GOAL_TYPES[k].label}</b><br><span class="small muted">${desc}</span></span></button>`;
    body = `<div class="stack">
      <h1>Tu meta de ejercicio</h1><p class="muted">Cada ${gt.period === 'month' ? 'mes' : 'semana'} que la cumplas, tu racha sube.</p>
      <div class="stack-s">
        ${opt('days_per_week', '📅', 'Ej. entrenar 3 días a la semana')}
        ${opt('minutes_per_week', '⏱️', 'Ej. 150 minutos a la semana')}
        ${opt('km_per_month', '🛣️', 'Ej. correr 50 km al mes')}
      </div>
      <div class="card stack-s center"><span class="muted small bold">Objetivo</span>
        <div class="stepper"><button class="icon-btn" data-step="-1" aria-label="Menos">−</button>
        <output id="o-target">${d.target}</output>
        <button class="icon-btn" data-step="1" aria-label="Más">+</button></div>
        <span class="muted">${gt.short} por ${gt.period === 'month' ? 'mes' : 'semana'}</span></div>
    </div>`;
  } else {
    const p = { sex: d.sex, birthYear: d.birthYear, heightCm: d.heightCm, weightKg: d.weightKg };
    const sug = suggestedGoal(p, d.deficit);
    if (d.calorieGoal == null) d.calorieGoal = sug;
    const opt = (v, l) => `<button class="chip" data-def="${v}" aria-pressed="${d.deficit === v}">${l}</button>`;
    body = `<div class="stack">
      <h1>Calorías y agua</h1>
      <p class="muted">Gastas unas <b>${tdee(p)} kcal</b> al día. Elige tu ritmo:</p>
      <div class="chips">${opt(0, 'Mantener')}${opt(250, 'Suave −250')}${opt(500, 'Normal −500')}${opt(750, 'Intenso −750')}</div>
      <label class="field"><span>Meta diaria (kcal)</span><input class="input" id="o-kcal" type="number" inputmode="numeric" min="1000" max="6000" step="10" value="${d.calorieGoal}"></label>
      <label class="field"><span>Meta de agua (ml)</span><input class="input" id="o-water" type="number" inputmode="numeric" min="500" max="6000" step="250" value="${d.waterGoalMl}"></label>
      <p class="small muted">Puedes cambiar todo después en Ajustes. Esto es una estimación, no un consejo médico.</p>
    </div>`;
  }

  root.innerHTML = `<div class="onb">${steps}<div>${body}</div>
    <div class="row">${d.step > 0 ? '<button class="btn btn-secondary" id="o-back">Atrás</button>' : ''}
    <button class="btn btn-primary btn-lg grow" id="o-next" ${canNext ? '' : 'disabled'}>${d.step === STEPS - 1 ? '¡Empezar!' : 'Continuar'}</button></div></div>`;

  const next = root.querySelector('#o-next');
  const $in = (id) => root.querySelector(id);

  $in('#o-name')?.addEventListener('input', (e) => { d.name = e.target.value; next.disabled = !d.name.trim(); });
  $in('#o-name')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && d.name.trim()) next.click(); });
  root.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => { readBody(); d.sex = b.dataset.sex; render(root); }));
  root.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    d.goalType = b.dataset.goal; d.target = GOAL_TYPES[d.goalType].def; render(root);
  }));
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const gt = GOAL_TYPES[d.goalType];
    d.target = clamp(d.target + Number(b.dataset.step) * (gt.step * (gt.step > 1 ? 1 : 1) * (d.goalType === 'days_per_week' ? 1 : 5)), gt.min, gt.max);
    $in('#o-target').textContent = d.target;
  }));
  root.querySelectorAll('[data-def]').forEach((b) => b.addEventListener('click', () => {
    d.deficit = Number(b.dataset.def); d.calorieGoal = null; render(root);
  }));

  function readBody() {
    if ($in('#o-year')) {
      d.birthYear = clamp(Number($in('#o-year').value) || 1998, 1920, new Date().getFullYear() - 10);
      d.heightCm = clamp(Number($in('#o-h').value) || 165, 100, 250);
      d.weightKg = clamp(Number($in('#o-w').value) || 65, 25, 350);
    }
    if ($in('#o-kcal')) {
      d.calorieGoal = clamp(Math.round(Number($in('#o-kcal').value) || 2000), 1000, 6000);
      d.waterGoalMl = clamp(Math.round(Number($in('#o-water').value) || 2000), 500, 6000);
    }
  }

  $in('#o-back')?.addEventListener('click', () => { readBody(); d.step--; render(root); });
  next.addEventListener('click', () => {
    readBody();
    if (d.step < STEPS - 1) {
      if (d.step === 1) d.waterGoalMl = Math.round((d.weightKg * 35) / 250) * 250;
      d.step++;
      render(root);
      return;
    }
    update((s) => {
      s.profile = {
        name: d.name.trim(), sex: d.sex, birthYear: d.birthYear, heightCm: d.heightCm, weightKg: d.weightKg,
        calorieGoal: d.calorieGoal, waterGoalMl: d.waterGoalMl, createdAt: new Date().toISOString(),
      };
      s.goal = { ...s.goal, type: d.goalType, target: d.target, activityFilter: 'any' };
    });
    draft.step = 0;
    go('#/home');
  });
}
