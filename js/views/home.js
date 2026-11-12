// S02 Inicio: mascota, racha, semana, resumen del día.
import { get } from '../store.js';
import { esc, dayKey, startOfWeek, addDays, WEEKDAYS_SHORT, fmtDayLabel, fmtDur, fmtNum, fmtTime } from '../util.js';
import { computeStreak, mascotMood, mascotLine, periodNoun, GOAL_TYPES } from '../logic/streak.js';
import { dayNutrition } from '../logic/nutrition.js';
import { mascot } from '../ui/art.js';
import { activity } from '../data/activities.js';
import { addWater } from '../actions.js';
import { rerender, toast } from '../ui.js';
import { installCard, wireInstall } from '../install.js';

export function render(root) {
  const st = get();
  const s = computeStreak(st);
  const mood = mascotMood(st, s);
  const n = dayNutrition(st);
  const gt = GOAL_TYPES[st.goal.type];
  const h = new Date().getHours();
  const hello = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  const ws = startOfWeek(new Date());
  const todayKey = dayKey();
  const week = WEEKDAYS_SHORT.map((l, i) => {
    const k = dayKey(addDays(ws, i));
    const w = st.workouts.find((x) => dayKey(x.startAt) === k);
    return `<div class="d ${k === todayKey ? 'today' : ''}"><span class="dot ${w ? 'on' : ''}" title="${k}">${w ? activity(w.activityId).icon : ''}</span>${l}</div>`;
  }).join('');

  const pct = Math.min(100, (s.current / s.target) * 100);
  const remaining = Math.max(0, Math.round((s.target - s.current) * 10) / 10);
  const status = s.curMet
    ? `<span class="pill ok">✓ Meta cumplida</span>`
    : `<span class="pill warn">${remaining === 1 ? 'Falta' : 'Faltan'} ${fmtNum(remaining, remaining % 1 ? 1 : 0)} ${remaining === 1 && st.goal.type === 'days_per_week' ? 'día' : gt.short} · ${s.daysLeft === 1 ? 'queda 1 día' : `quedan ${s.daysLeft} días`}</span>`;

  const recent = [...st.workouts].sort((a, b) => new Date(b.startAt) - new Date(a.startAt)).slice(0, 4);
  const waterPct = Math.min(100, (n.water / n.waterGoal) * 100);
  const kcalPct = Math.min(100, (n.eaten / Math.max(1, n.goal + n.burned)) * 100);

  root.innerHTML = `
  <header class="topbar">
    <div class="grow"><p class="muted small bold">${hello}</p><h1 class="title-xl ellipsis">${esc(st.profile.name)}</h1></div>
    <a class="icon-btn" href="#/cards" aria-label="Cartas${st.packs ? `, ${st.packs} sobres sin abrir` : ''}">🎴${st.packs ? `<span class="badge">${st.packs}</span>` : ''}</a>
    <a class="icon-btn" href="#/settings" aria-label="Ajustes">⚙️</a>
  </header>

  <section class="stack">
    ${installCard()}
    <div class="hero">
      <div>${mascot(mood)}</div>
      <div class="bubble">${mascotLine(mood)}</div>
    </div>

    <a class="card card-link" href="#/goals">
      <div class="row between">
        <div><div class="streak-num">${s.streak} 🔥</div><div class="muted small bold">${s.streak === 1 ? periodNoun(st.goal) : periodNoun(st.goal, true)} de racha</div></div>
        <div class="center"><div class="bold">🛡️ ${st.goal.shields}</div><div class="xs muted">escudos</div></div>
      </div>
      <div class="stack-s" style="margin-top:12px">
        <div class="row between small"><b>${fmtNum(s.current, s.current % 1 ? 1 : 0)} / ${s.target} ${gt.short}</b>${status}</div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      </div>
      ${s.canShield ? '<p class="small" style="margin-top:8px;color:var(--shield)"><b>⚠ Tu racha está en peligro.</b> Toca para usar un escudo.</p>' : ''}
    </a>

    <div class="card"><div class="card-title"><h3>Esta semana</h3><a class="small bold" href="#/calendar">Calendario</a></div>
      <div class="week-strip">${week}</div></div>

    <div class="quick">
      <a class="card card-link stack-s" href="#/diet">
        <span class="muted small bold">🍽️ Calorías</span>
        <b>${fmtNum(n.eaten)} <span class="muted small">/ ${fmtNum(n.goal + n.burned)}</span></b>
        <div class="progress ${n.eaten > n.goal + n.burned ? 'over' : ''}"><i style="width:${kcalPct}%"></i></div>
        <span class="xs muted">${n.remaining >= 0 ? `Quedan ${fmtNum(n.remaining)} kcal` : `${fmtNum(-n.remaining)} kcal de más`}</span>
      </a>
      <div class="card stack-s">
        <span class="muted small bold">💧 Agua</span>
        <b>${fmtNum(n.water)} <span class="muted small">/ ${fmtNum(n.waterGoal)} ml</span></b>
        <div class="progress water"><i style="width:${waterPct}%"></i></div>
        <button class="btn btn-water btn-sm" data-water="250">+ 250 ml</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>Últimos entrenos</h3><a class="small bold" href="#/stats">Ver progreso</a></div>
      ${recent.length ? `<div class="list">${recent.map((w) => {
        const a = activity(w.activityId);
        return `<a class="list-item" href="#/workout/${w.id}"><span class="list-ico">${a.icon}</span>
          <span class="grow"><b class="ellipsis" style="display:block">${esc(a.name)}</b><span class="small muted">${fmtDayLabel(w.startAt)} · ${fmtTime(w.startAt)}</span></span>
          <span class="small bold">${fmtDur(w.durationMin)}${w.distanceKm ? `<br><span class="muted">${fmtNum(w.distanceKm, 1)} km</span>` : ''}</span></a>`;
      }).join('')}</div>`
      : `<div class="empty"><span class="big">🏁</span><p>Aún no registras entrenos.<br>¡El primero te da un sobre de cartas!</p><a class="btn btn-primary" href="#/log">Registrar entreno</a></div>`}
    </div>
  </section>`;

  wireInstall(root);
  root.querySelector('[data-water]').addEventListener('click', () => {
    addWater(250);
    const left = dayNutrition(get()).waterGoal - dayNutrition(get()).water;
    toast(left > 0 ? `💧 +250 ml · faltan ${fmtNum(left)} ml` : '💧 ¡Meta de agua cumplida!');
    rerender();
  });
}
