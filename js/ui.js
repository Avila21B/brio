// Helpers de interfaz: navegación, toasts, hojas modales.
import { $ } from './util.js';

let rerenderFn = () => {};
export const setRerender = (f) => { rerenderFn = f; };
export const rerender = () => rerenderFn();
export const go = (hash) => {
  if (location.hash === hash) rerender();
  else location.hash = hash;
};
export const back = (fallback = '#/home') => {
  if (history.length > 1) history.back();
  else location.hash = fallback;
};

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

let closeCurrent = null;
export function sheet(html, { onMount, label = 'Diálogo', onClose } = {}) {
  if (closeCurrent) closeCurrent();
  const overlay = $('#overlay');
  const prevFocus = document.activeElement;
  overlay.innerHTML = `<div class="scrim" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${label}"><div class="grip"></div>${html}</div>`;
  overlay.classList.add('open');
  const box = overlay.querySelector('.sheet');
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    overlay.classList.remove('open');
    overlay.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    closeCurrent = null;
    prevFocus?.focus?.();
    onClose?.();
  }
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  closeCurrent = close;
  onMount?.(box, close);
  (box.querySelector('[autofocus]') || box.querySelector('input,button,select,textarea'))?.focus();
  return close;
}
export const closeSheet = () => closeCurrent?.();

export function confirmDialog(message, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    sheet(`<div class="stack"><h2>${message}</h2>
      <div class="row"><button class="btn btn-secondary grow" data-close>Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} grow" id="cfm-ok">${ok}</button></div></div>`, {
      label: 'Confirmación',
      onMount(box, close) {
        box.querySelector('#cfm-ok').addEventListener('click', () => { answered = true; resolve(true); close(); });
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}

export const topbar = (title, { backHref, right = '' } = {}) => `
  <header class="topbar">
    ${backHref ? `<a class="icon-btn" href="${backHref}" data-back aria-label="Volver">←</a>` : ''}
    <h1>${title}</h1>${right}
  </header>`;

// Activa los enlaces "volver" para usar el historial cuando existe
export function wireBack(root) {
  root.querySelectorAll('[data-back]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); back(a.getAttribute('href')); }));
}
