// S12 Cartas coleccionables: abrir sobres y ver la colección.
import { get, update } from '../store.js';
import { esc } from '../util.js';
import { CARDS, SERIES, RARITY, card } from '../data/cards.js';
import { drawCard } from '../logic/streak.js';
import { topbar, wireBack, rerender, sheet } from '../ui.js';

const cardHtml = (c, count = 1) => `<div class="ccard ${c.rarity}" title="${esc(c.name)} · ${RARITY[c.rarity].label}">
  ${count > 1 ? `<span class="x">×${count}</span>` : ''}<span class="e" aria-hidden="true">${c.icon}</span><span class="n">${esc(c.name)}</span></div>`;

export function render(root) {
  const st = get();
  const counts = {};
  for (const x of st.cards) counts[x.cardId] = (counts[x.cardId] || 0) + 1;
  const owned = Object.keys(counts).length;

  root.innerHTML = `${topbar('Cartas', { backHref: '#/home' })}
  <div class="stack">
    <div class="card center stack-s">
      ${st.packs ? `<div><span class="pack" aria-hidden="true">🎴</span></div>
        <p class="bold">Tienes ${st.packs} sobre${st.packs === 1 ? '' : 's'} sin abrir</p>
        <button class="btn btn-primary btn-lg" id="open">Abrir sobre</button>`
      : `<div style="font-size:48px" aria-hidden="true">🎴</div><p class="bold">No tienes sobres por abrir</p>
        <p class="small muted">Ganas sobres al cumplir tu meta de cada periodo y al llegar a 1, 5, 10, 25, 50… entrenos.</p>`}
    </div>
    <p class="center bold">${owned} de ${CARDS.length} cartas descubiertas</p>
    ${SERIES.map(([sid, name, desc]) => {
      const list = CARDS.filter((c) => c.series === sid);
      const got = list.filter((c) => counts[c.id]).length;
      return `<section class="card stack-s">
        <div class="row between"><div><h3>${esc(name)}</h3><span class="xs muted">${esc(desc)}</span></div><span class="pill ${got === list.length ? 'ok' : ''}">${got}/${list.length}</span></div>
        <div class="cards-grid">${list.map((c) => counts[c.id] ? cardHtml(c, counts[c.id])
          : `<div class="ccard locked" aria-label="Carta bloqueada"><span class="e" aria-hidden="true">${c.icon}</span><span class="n">???</span></div>`).join('')}</div>
      </section>`;
    }).join('')}
    <p class="xs muted center">Rarezas: ${Object.values(RARITY).map((r) => `${r.label} ${r.weight}%`).join(' · ')}</p>
  </div>`;
  wireBack(root);

  root.querySelector('#open')?.addEventListener('click', () => {
    const c = drawCard();
    const isNew = !st.cards.some((x) => x.cardId === c.id);
    update((s) => { s.packs = Math.max(0, s.packs - 1); s.cards.push({ cardId: c.id, obtainedAt: new Date().toISOString() }); });
    sheet(`<div class="reveal">
      <span class="pill ${isNew ? 'ok' : ''}">${isNew ? '✨ ¡Nueva!' : 'Repetida'}</span>
      ${cardHtml(card(c.id))}
      <p class="bold">${esc(c.name)}</p><p class="small muted">${RARITY[c.rarity].label} · serie ${esc(SERIES.find(([s]) => s === c.series)[1])}</p>
      <button class="btn btn-primary btn-block" data-close>${get().packs ? `Genial (quedan ${get().packs})` : 'Genial'}</button></div>`,
    { label: 'Carta obtenida', onClose: rerender });
  });
}
