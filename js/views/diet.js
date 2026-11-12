// S08 Dieta, S09 Añadir alimento, S10 Agua, S11 Ayuno.
import { get, update } from '../store.js';
import { esc, dayKey, parseDay, addDays, fmtDayLabel, fmtNum, fmtClock, fmtDate, fmtTime, normalize, uid, clamp, toLocalInput } from '../util.js';
import { dayNutrition, FAST_PROTOCOLS, FAST_STAGES } from '../logic/nutrition.js';
import { FOODS, MEALS } from '../data/foods.js';
import { addWater, addFood, deleteFood } from '../actions.js';
import { topbar, wireBack, go, rerender, toast, sheet, confirmDialog } from '../ui.js';
import { ring } from '../ui/art.js';

export function render(root, r) {
  if (r.name === 'food') return foodPicker(root, r);
  if (r.name === 'fast') return fastView(root);
  return dietDay(root, r);
}

const activeFast = (st) => st.fasts.find((f) => !f.endAt);

// ---------- S08 ----------
function dietDay(root, r) {
  const st = get();
  const key = /^\d{4}-\d{2}-\d{2}$/.test(r.query.d || '') ? r.query.d : dayKey();
  const isToday = key === dayKey();
  const n = dayNutrition(st, key);
  const budget = n.goal + n.burned;
  const over = n.eaten > budget;
  const prev = dayKey(addDays(parseDay(key), -1)), next = dayKey(addDays(parseDay(key), 1));
  const glasses = Math.max(1, Math.round(n.waterGoal / 250));
  const fast = activeFast(st);

  root.innerHTML = `${topbar('Comida y agua')}
  <div class="stack">
    <div class="row between">
      <a class="icon-btn" href="#/diet?d=${prev}" aria-label="Día anterior">‹</a>
      <b>${fmtDayLabel(parseDay(key))}</b>
      ${isToday ? '<span style="width:44px"></span>' : `<a class="icon-btn" href="#/diet?d=${next}" aria-label="Día siguiente">›</a>`}
    </div>

    <div class="card row" style="gap:16px">
      ${ring(n.eaten, budget, { size: 128, cls: over ? 'over' : '', center: `<b style="font-size:22px">${fmtNum(Math.abs(n.remaining))}</b><span class="xs muted">${n.remaining >= 0 ? 'kcal restantes' : 'kcal de más'}</span>` })}
      <div class="grow stack-s small">
        <div class="row between"><span class="muted">🎯 Meta</span><b>${fmtNum(n.goal)}</b></div>
        <div class="row between"><span class="muted">🍽️ Comida</span><b>− ${fmtNum(n.eaten)}</b></div>
        <div class="row between"><span class="muted">🔥 Ejercicio</span><b>+ ${fmtNum(n.burned)}</b></div>
        <div class="row between xs muted"><span>P ${n.protein} g</span><span>C ${n.carbs} g</span><span>G ${n.fat} g</span></div>
      </div>
    </div>

    <div class="card stack-s">
      <div class="row between"><h3>💧 Agua</h3><b>${fmtNum(n.water)} / ${fmtNum(n.waterGoal)} ml</b></div>
      <div class="water-glasses" aria-hidden="true">${Array.from({ length: glasses }, (_, i) => `<i class="${i < Math.floor(n.water / 250) ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row"><button class="btn btn-sm btn-secondary" data-w="-250" ${n.water ? '' : 'disabled'}>− 250</button>
        <button class="btn btn-sm btn-water grow" data-w="250">+ 250 ml</button><button class="btn btn-sm btn-water grow" data-w="500">+ 500 ml</button></div>
    </div>

    <a class="card card-link row" href="#/fast">
      <span class="list-ico">⏳</span>
      <span class="grow"><b>Ayuno intermitente</b><br><span class="small muted" id="fast-txt">${fast ? `En ayuno · ${fmtClock((Date.now() - new Date(fast.startAt)) / 1000)} de ${fast.targetHours} h` : 'Sin ayuno activo'}</span></span>
      <span aria-hidden="true">›</span>
    </a>

    ${MEALS.map(([m, label, icon]) => {
      const logs = n.logs.filter((l) => l.meal === m);
      const kcal = logs.reduce((a, l) => a + l.kcal, 0);
      return `<section class="card">
        <div class="card-title"><h3>${icon} ${label}</h3><span class="small muted bold">${fmtNum(kcal)} kcal</span></div>
        ${logs.length ? `<div class="list">${logs.map((l) => `<div class="list-item" style="cursor:default">
          <span class="grow"><b class="ellipsis" style="display:block">${esc(l.name)}</b><span class="xs muted">${l.grams ? `${fmtNum(l.grams)} g · ` : ''}${fmtNum(l.kcal)} kcal</span></span>
          <button class="icon-btn" data-del="${l.id}" aria-label="Quitar ${esc(l.name)}">✕</button></div>`).join('')}</div>` : ''}
        <a class="btn btn-sm btn-secondary" href="#/food/${m}?d=${key}" style="margin-top:8px">+ Añadir</a>
      </section>`;
    }).join('')}
  </div>`;

  root.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
    addWater(Number(b.dataset.w), key); rerender();
  }));
  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    deleteFood(b.dataset.del); toast('Alimento quitado'); rerender();
  }));
  if (fast) {
    const t = setInterval(() => {
      const el = root.querySelector('#fast-txt');
      if (el) el.textContent = `En ayuno · ${fmtClock((Date.now() - new Date(fast.startAt)) / 1000)} de ${fast.targetHours} h`;
    }, 1000);
    return () => clearInterval(t);
  }
}

// ---------- S09 ----------
function foodPicker(root, r) {
  const st = get();
  const meal = MEALS.find(([m]) => m === r.args[0]) || MEALS[0];
  const date = /^\d{4}-\d{2}-\d{2}$/.test(r.query.d || '') ? r.query.d : dayKey();
  const backHref = `#/diet?d=${date}`;
  const all = [...st.customFoods.map((f) => ({ ...f, custom: true })), ...FOODS];
  const recentNames = [...new Set(st.foodLogs.slice(-40).reverse().map((l) => l.name))].slice(0, 8);
  const recent = recentNames.map((nm) => all.find((f) => f.name === nm)).filter(Boolean);

  root.innerHTML = `${topbar(`${meal[2]} ${meal[1]}`, { backHref })}
  <div class="stack">
    <div class="seg" role="group" aria-label="Modo"><button data-mode="lib" aria-pressed="true">Biblioteca</button><button data-mode="manual" aria-pressed="false">Manual</button></div>
    <div id="lib" class="stack">
      <input class="input" id="q" type="search" placeholder="🔎 Buscar entre ${all.length} alimentos" aria-label="Buscar alimento" autocomplete="off">
      <div class="card"><h3 id="lt" style="margin-bottom:4px">${recent.length ? 'Recientes' : 'Populares'}</h3><div class="list" id="fl"></div></div>
    </div>
    <form id="manual" class="card stack" hidden novalidate>
      <label class="field"><span>Nombre</span><input class="input" id="m-name" maxlength="60" required placeholder="Ej. Sándwich de la casa"></label>
      <div class="fields-2">
        <label class="field"><span>Calorías (kcal)</span><input class="input" id="m-kcal" type="number" inputmode="numeric" min="0" max="5000" required></label>
        <label class="field"><span>Cantidad (g)</span><input class="input" id="m-g" type="number" inputmode="numeric" min="0" max="5000" placeholder="Opcional"></label>
        <label class="field"><span>Proteína (g)</span><input class="input" id="m-p" type="number" inputmode="decimal" min="0" max="500" placeholder="0"></label>
        <label class="field"><span>Carbohidratos (g)</span><input class="input" id="m-c" type="number" inputmode="decimal" min="0" max="1000" placeholder="0"></label>
        <label class="field"><span>Grasa (g)</span><input class="input" id="m-f" type="number" inputmode="decimal" min="0" max="500" placeholder="0"></label>
      </div>
      <label class="row small"><input type="checkbox" id="m-save" checked> Guardar en mis alimentos</label>
      <p id="m-err" class="small" role="alert" style="color:var(--danger)"></p>
      <button class="btn btn-primary btn-block" type="submit">Añadir</button>
    </form>
  </div>`;
  wireBack(root);

  const list = root.querySelector('#fl'), q = root.querySelector('#q');
  const row = (f) => `<button class="list-item" data-f="${f.id}"><span class="grow"><b class="ellipsis" style="display:block">${esc(f.name)}${f.custom ? ' ⭐' : ''}</b>
    <span class="xs muted">${esc(f.portionName || `${f.portion} g`)} · ${fmtNum((f.kcal * f.portion) / 100)} kcal</span></span><span aria-hidden="true">＋</span></button>`;
  const paint = () => {
    const t = normalize(q.value.trim());
    const items = t ? all.filter((f) => normalize(f.name).includes(t)).slice(0, 60) : (recent.length ? recent : FOODS.slice(0, 15));
    root.querySelector('#lt').textContent = t ? `Resultados (${items.length})` : recent.length ? 'Recientes' : 'Populares';
    list.innerHTML = items.length ? items.map(row).join('') : '<div class="empty"><p>No lo encontramos.</p><button class="btn btn-secondary" id="to-manual">Añadir a mano</button></div>';
    list.querySelector('#to-manual')?.addEventListener('click', () => { setMode('manual'); root.querySelector('#m-name').value = q.value; });
    list.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => portionSheet(all.find((f) => f.id === b.dataset.f))));
  };
  q.addEventListener('input', paint);
  paint();

  const setMode = (mode) => {
    root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    root.querySelector('#lib').hidden = mode !== 'lib';
    root.querySelector('#manual').hidden = mode !== 'manual';
  };
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  function portionSheet(f) {
    let grams = f.portion;
    sheet(`<div class="stack"><h2>${esc(f.name)}</h2>
      <div class="chips">${[0.5, 1, 1.5, 2].map((x) => `<button class="chip" data-x="${x}" aria-pressed="${x === 1}">${x === 1 ? esc(f.portionName || '1 porción') : `${x}×`}</button>`).join('')}</div>
      <label class="field"><span>Cantidad (g)</span><input class="input" id="pg" type="number" inputmode="numeric" min="1" max="5000" value="${grams}"></label>
      <div class="stat-grid"><div class="stat"><b id="pk"></b><span>kcal</span></div><div class="stat"><b id="pm" class="small"></b><span>P · C · G</span></div></div>
      <button class="btn btn-primary btn-block btn-lg" id="padd">Añadir a ${meal[1].toLowerCase()}</button></div>`, {
      label: 'Cantidad',
      onMount(box, close) {
        const inp = box.querySelector('#pg');
        const calc = () => {
          grams = clamp(Number(inp.value) || 0, 0, 5000);
          const k = grams / 100;
          box.querySelector('#pk').textContent = fmtNum(f.kcal * k);
          box.querySelector('#pm').textContent = `${fmtNum(f.protein * k)} · ${fmtNum(f.carbs * k)} · ${fmtNum(f.fat * k)} g`;
        };
        inp.addEventListener('input', calc);
        box.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => {
          inp.value = Math.round(f.portion * Number(b.dataset.x));
          box.querySelectorAll('[data-x]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          calc();
        }));
        calc();
        box.querySelector('#padd').addEventListener('click', () => {
          if (!(grams > 0)) { inp.focus(); return; }
          const k = grams / 100;
          addFood({ date, meal: meal[0], name: f.name, grams, kcal: Math.round(f.kcal * k), protein: +(f.protein * k).toFixed(1), carbs: +(f.carbs * k).toFixed(1), fat: +(f.fat * k).toFixed(1) });
          close();
          toast(`${f.name} añadido`);
          go(backHref);
        });
      },
    });
  }

  root.querySelector('#manual').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => root.querySelector(id).value;
    const name = v('#m-name').trim(), kcal = Number(v('#m-kcal')), grams = Number(v('#m-g')) || 0;
    const err = root.querySelector('#m-err');
    if (!name) { err.textContent = 'Escribe un nombre.'; return; }
    if (!(kcal >= 0) || v('#m-kcal') === '') { err.textContent = 'Indica las calorías.'; return; }
    const p = Number(v('#m-p')) || 0, c = Number(v('#m-c')) || 0, f = Number(v('#m-f')) || 0;
    addFood({ date, meal: meal[0], name, grams: grams || undefined, kcal: Math.round(kcal), protein: p, carbs: c, fat: f });
    if (root.querySelector('#m-save').checked) {
      const base = grams || 100, k = 100 / base;
      update((s) => {
        s.customFoods = s.customFoods.filter((x) => x.name !== name);
        s.customFoods.unshift({ id: 'c' + uid(), name, kcal: kcal * k, protein: p * k, carbs: c * k, fat: f * k, portion: base, portionName: grams ? `${grams} g` : '1 porción' });
      });
    }
    toast(`${name} añadido`);
    go(backHref);
  });
}

// ---------- S11 ----------
function fastView(root) {
  const st = get();
  const fast = activeFast(st);
  const proto = st.settings.fastProtocol || 16;
  const history = st.fasts.filter((f) => f.endAt).slice(-8).reverse();

  root.innerHTML = `${topbar('Ayuno intermitente', { backHref: '#/diet' })}
  <div class="stack">
    <div class="card stack center" id="fast-card"></div>
    ${fast ? '' : `<div class="card stack-s"><h3>Protocolo</h3><div class="chips">${FAST_PROTOCOLS.map(([h, l, d]) => `<button class="chip" data-p="${h}" aria-pressed="${h === proto}" title="${d}">${l}</button>`).join('')}</div>
      <p class="small muted">${FAST_PROTOCOLS.find(([h]) => h === proto)?.[2] || ''}: ${proto} h de ayuno.</p></div>`}
    <div class="card"><h3 style="margin-bottom:4px">Historial</h3>
      ${history.length ? `<div class="list">${history.map((f) => {
        const hrs = (new Date(f.endAt) - new Date(f.startAt)) / 3600000;
        return `<div class="list-item" style="cursor:default"><span class="list-ico">${hrs >= f.targetHours ? '✅' : '⏹️'}</span>
          <span class="grow"><b>${fmtNum(hrs, 1)} h</b> <span class="muted small">de ${f.targetHours} h</span><br><span class="xs muted">${fmtDate(f.startAt, { weekday: 'short', day: 'numeric', month: 'short' })}</span></span></div>`;
      }).join('')}</div>` : '<p class="muted small">Tus ayunos terminados aparecerán aquí.</p>'}</div>
    <p class="xs muted">Consulta a un profesional de salud antes de hacer ayunos largos.</p>
  </div>`;
  wireBack(root);

  const card = root.querySelector('#fast-card');
  const paint = () => {
    if (!fast) {
      card.innerHTML = `${ring(0, 1, { size: 200, stroke: 16, cls: 'fast', center: `<b style="font-size:32px">${proto} h</b><span class="small muted">listo para empezar</span>` })}
        <label class="field" style="text-align:left"><span>Empecé a ayunar</span><input class="input" type="datetime-local" id="fs" value="${toLocalInput(new Date())}" max="${toLocalInput(new Date())}"></label>
        <button class="btn btn-primary btn-lg btn-block" id="fstart">Empezar ayuno</button>`;
      card.querySelector('#fstart').addEventListener('click', () => {
        const t = new Date(card.querySelector('#fs').value);
        const startAt = Number.isNaN(t.getTime()) || t > new Date() ? new Date() : t;
        update((s) => { s.fasts.push({ id: uid(), startAt: startAt.toISOString(), targetHours: proto }); });
        toast('⏳ Ayuno iniciado'); rerender();
      });
      return;
    }
    const hrsNow = () => (Date.now() - new Date(fast.startAt)) / 3600000;
    const endT = new Date(new Date(fast.startAt).getTime() + fast.targetHours * 3600000);
    if (!card.querySelector('#fend')) {
      card.innerHTML = `<div id="fr"></div><div id="fstage"></div>
        <p class="small">Terminas a las <b>${fmtTime(endT)}</b>${dayKey(endT) !== dayKey() ? ` (${fmtDayLabel(endT).toLowerCase()})` : ''}</p>
        <button class="btn btn-primary btn-lg btn-block" id="fend">Terminar ayuno</button>`;
      card.querySelector('#fend').addEventListener('click', onEnd);
    }
    const hrs = hrsNow();
    const stage = [...FAST_STAGES].reverse().find(([h]) => hrs >= h);
    card.querySelector('#fr').innerHTML = ring(hrs, fast.targetHours, { size: 200, stroke: 16, cls: 'fast', center: `<b style="font-size:30px">${fmtClock(hrs * 3600)}</b><span class="small muted">${hrs >= fast.targetHours ? '¡Meta lograda! 🎉' : `de ${fast.targetHours} h`}</span>` });
    card.querySelector('#fstage').innerHTML = `<b>${stage[1]}</b><p class="small muted">${stage[2]}</p>`;

    async function onEnd() {
      const hrs = hrsNow();
      if (hrs < fast.targetHours && !(await confirmDialog('Aún no llegas a la meta. ¿Terminar igual?', { ok: 'Terminar' }))) return;
      update((s) => { const f = s.fasts.find((x) => x.id === fast.id); if (f) f.endAt = new Date().toISOString(); });
      toast(hrs >= fast.targetHours ? '¡Ayuno completado! 🎉' : 'Ayuno terminado'); rerender();
    }
  };
  paint();
  root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    update((s) => { s.settings.fastProtocol = Number(b.dataset.p); }); rerender();
  }));
  if (fast) { const t = setInterval(paint, 1000); return () => clearInterval(t); }
}
