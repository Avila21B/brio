// S16 Ajustes y S15 Equipo / etiquetas.
import * as store from '../store.js';
import { esc, clamp, fmtNum, fmtDur, uid, dayKey } from '../util.js';
import { suggestedGoal, tdee, bmi } from '../logic/nutrition.js';
import { tagTotals } from '../logic/stats.js';
import { topbar, wireBack, rerender, toast, confirmDialog, go } from '../ui.js';
import { applyTheme } from '../app.js';

export function render(root, r) {
  return r.name === 'tags' ? tags(root) : settings(root);
}

function settings(root) {
  const st = store.get();
  const p = st.profile;
  const b = bmi(p);
  const theme = st.settings.theme;

  root.innerHTML = `${topbar('Ajustes', { backHref: '#/home' })}
  <div class="stack">
    <form class="card stack" id="pf" novalidate>
      <h3>Perfil</h3>
      <label class="field"><span>Nombre</span><input class="input" id="s-name" maxlength="40" value="${esc(p.name)}" required></label>
      <div class="fields-2">
        <label class="field"><span>Sexo</span><select class="input select" id="s-sex">
          ${[['f', 'Mujer'], ['m', 'Hombre'], ['x', 'Prefiero no decirlo']].map(([v, l]) => `<option value="${v}" ${p.sex === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Año de nacimiento</span><input class="input" id="s-year" type="number" inputmode="numeric" min="1920" max="${new Date().getFullYear() - 10}" value="${p.birthYear}"></label>
        <label class="field"><span>Altura (cm)</span><input class="input" id="s-h" type="number" inputmode="numeric" min="100" max="250" value="${p.heightCm}"></label>
        <label class="field"><span>Peso (kg)</span><input class="input" id="s-w" type="number" inputmode="decimal" step="0.1" min="25" max="350" value="${p.weightKg}"></label>
      </div>
      ${b ? `<p class="small muted">IMC ${fmtNum(b, 1)} · gasto estimado ${fmtNum(tdee(p))} kcal/día</p>` : ''}
      <h3>Metas diarias</h3>
      <div class="fields-2">
        <label class="field"><span>Calorías (kcal)</span><input class="input" id="s-kcal" type="number" inputmode="numeric" min="1000" max="6000" step="10" value="${p.calorieGoal}"></label>
        <label class="field"><span>Agua (ml)</span><input class="input" id="s-water" type="number" inputmode="numeric" min="500" max="6000" step="250" value="${p.waterGoalMl}"></label>
      </div>
      <button type="button" class="btn btn-sm btn-secondary" id="suggest">Sugerir calorías (déficit de 500)</button>
      <button class="btn btn-primary btn-block" type="submit">Guardar perfil</button>
    </form>

    <div class="card stack-s">
      <h3>Apariencia</h3>
      <div class="seg" role="group" aria-label="Tema">
        ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button data-theme="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <a class="list-item" href="#/tags"><span class="list-ico">🏷️</span><span class="grow"><b>Equipo y etiquetas</b><br><span class="small muted">Zapatillas, raquetas, gimnasios y gastos</span></span>›</a>
      <a class="list-item" href="#/cards"><span class="list-ico">🎴</span><span class="grow"><b>Mis cartas</b><br><span class="small muted">${new Set(st.cards.map((c) => c.cardId)).size} descubiertas</span></span>›</a>
      <a class="list-item" href="#/goals"><span class="list-ico">🔥</span><span class="grow"><b>Meta de ejercicio</b></span>›</a>
    </div>

    <div class="card stack-s">
      <h3>Tus datos</h3>
      <p class="small muted">Todo se guarda solo en este dispositivo. Haz una copia para pasarla a otro teléfono.</p>
      <div class="row wrap"><button class="btn btn-secondary grow" id="export">⬇ Exportar copia</button>
        <label class="btn btn-secondary grow" style="cursor:pointer">⬆ Importar copia<input type="file" id="import" accept="application/json,.json" class="sr-only"></label></div>
      <button class="btn btn-danger" id="reset">Borrar todos mis datos</button>
    </div>

    <div class="card soft stack-s center">
      <b>Brío</b>
      <p class="small muted">Gratis para siempre: sin anuncios, sin suscripciones, sin cuentas. ${st.workouts.length} entrenos · ${st.foodLogs.length} comidas registradas.</p>
    </div>
  </div>`;
  wireBack(root);

  const $ = (id) => root.querySelector(id);
  $('#suggest').addEventListener('click', () => {
    const tmp = { sex: $('#s-sex').value, birthYear: Number($('#s-year').value), heightCm: Number($('#s-h').value), weightKg: Number($('#s-w').value) };
    $('#s-kcal').value = suggestedGoal(tmp, 500);
  });
  $('#pf').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#s-name').value.trim();
    if (!name) { toast('Escribe tu nombre'); $('#s-name').focus(); return; }
    store.update((s) => {
      Object.assign(s.profile, {
        name,
        sex: $('#s-sex').value,
        birthYear: clamp(Number($('#s-year').value) || p.birthYear, 1920, new Date().getFullYear() - 10),
        heightCm: clamp(Number($('#s-h').value) || p.heightCm, 100, 250),
        weightKg: clamp(Number($('#s-w').value) || p.weightKg, 25, 350),
        calorieGoal: clamp(Math.round(Number($('#s-kcal').value) || p.calorieGoal), 1000, 6000),
        waterGoalMl: clamp(Math.round(Number($('#s-water').value) || p.waterGoalMl), 500, 6000),
      });
    });
    toast('Perfil guardado');
    rerender();
  });
  root.querySelectorAll('[data-theme]').forEach((btn) => btn.addEventListener('click', () => {
    store.update((s) => { s.settings.theme = btn.dataset.theme; });
    applyTheme();
    rerender();
  }));
  $('#export').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `brio-copia-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Copia descargada');
  });
  $('#import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!(await confirmDialog('¿Reemplazar tus datos actuales con esta copia?', { ok: 'Importar', danger: true }))) { e.target.value = ''; return; }
    try {
      store.importJSON(await file.text());
      applyTheme();
      toast('Copia importada');
      go('#/home');
    } catch (err) {
      toast(err.message || 'No se pudo leer el archivo');
    }
  });
  $('#reset').addEventListener('click', async () => {
    if (!(await confirmDialog('¿Borrar todos tus datos? Se perderán entrenos, comidas y cartas. No se puede deshacer.', { ok: 'Borrar todo', danger: true }))) return;
    store.reset();
    applyTheme();
    go('#/onboarding');
  });
}

const KINDS = [['shoes', '👟', 'Zapatillas'], ['racket', '🎾', 'Raqueta'], ['gear', '🎒', 'Equipo'], ['gym', '🏢', 'Gimnasio / lugar'], ['other', '🏷️', 'Otro']];
const kindOf = (k) => KINDS.find(([x]) => x === k) || KINDS[4];

function tags(root) {
  const st = store.get();
  root.innerHTML = `${topbar('Equipo y etiquetas', { backHref: '#/stats' })}
  <div class="stack">
    <p class="small muted">Etiqueta tus entrenos para saber cuántos km llevan tus zapatillas, cuántas veces fuiste a un gimnasio o cuánto te costó cada uso.</p>
    <div class="card">
      ${st.tags.length ? `<div class="list">${st.tags.map((t) => {
        const tt = tagTotals(st, t.id);
        const k = kindOf(t.kind);
        return `<div class="list-item" style="cursor:default"><span class="list-ico">${k[1]}</span>
          <span class="grow"><b class="ellipsis" style="display:block">${esc(t.name)}</b>
          <span class="xs muted">${tt.count} uso${tt.count === 1 ? '' : 's'} · ${fmtDur(tt.minutes)}${tt.km ? ` · ${fmtNum(tt.km, 1)} km` : ''}${t.cost ? ` · S/ ${fmtNum(t.cost, 2)}${tt.count ? ` (S/ ${fmtNum(t.cost / tt.count, 2)} por uso)` : ''}` : ''}</span></span>
          <button class="icon-btn" data-del="${t.id}" aria-label="Eliminar ${esc(t.name)}">🗑️</button></div>`;
      }).join('')}</div>` : '<div class="empty"><span class="big">🏷️</span><p>Aún no tienes etiquetas.</p></div>'}
    </div>
    <form class="card stack" id="tf" novalidate>
      <h3>Nueva etiqueta</h3>
      <div class="chips" role="group" aria-label="Tipo">${KINDS.map(([k, e, l], i) => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${i === 0}">${e} ${l}</button>`).join('')}</div>
      <label class="field"><span>Nombre</span><input class="input" id="t-name" maxlength="40" placeholder="Ej. Zapatillas rojas" required></label>
      <label class="field"><span>Costo (opcional)</span><input class="input" id="t-cost" type="number" inputmode="decimal" min="0" step="0.01" placeholder="S/ 0.00"></label>
      <button class="btn btn-primary btn-block" type="submit">Crear etiqueta</button>
    </form>
  </div>`;
  wireBack(root);

  let kind = 'shoes';
  root.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    root.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  root.querySelector('#tf').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = root.querySelector('#t-name').value.trim();
    if (!name) { toast('Escribe un nombre'); root.querySelector('#t-name').focus(); return; }
    const cost = Number(root.querySelector('#t-cost').value) || undefined;
    store.update((s) => { s.tags.push({ id: uid(), kind, name, cost }); });
    toast('Etiqueta creada');
    rerender();
  });
  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmDialog('¿Eliminar esta etiqueta? Se quitará de tus entrenos.', { ok: 'Eliminar', danger: true }))) return;
    store.update((s) => {
      s.tags = s.tags.filter((t) => t.id !== b.dataset.del);
      for (const w of s.workouts) w.tagIds = (w.tagIds || []).filter((id) => id !== b.dataset.del);
    });
    rerender();
  }));
}
