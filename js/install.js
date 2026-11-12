// Instalación de la PWA: botón propio + instrucciones por navegador.
import { sheet, rerender, toast } from './ui.js';

let deferred = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  rerender();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  toast('¡Brío instalada! Búscala en tu pantalla de inicio 🔥');
  rerender();
});

export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSamsung = /SamsungBrowser/i.test(ua);
const isInApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|TikTok|wv\)/i.test(ua);

function steps() {
  if (isInApp) {
    return `<p>Estás viendo Brío dentro de otra app (WhatsApp, Instagram…), y ahí no se puede instalar.</p>
      <ol><li>Toca el menú <b>⋮</b> o <b>…</b> de arriba.</li><li>Elige <b>Abrir en Chrome</b> (o en el navegador).</li><li>Vuelve a tocar <b>Instalar app</b>.</li></ol>`;
  }
  if (isIOS) {
    return `<p>En iPhone se instala desde <b>Safari</b>:</p>
      <ol><li>Toca el botón <b>Compartir</b> (el cuadrado con flecha ↑) abajo.</li>
      <li>Baja y elige <b>Agregar a inicio</b>.</li><li>Toca <b>Agregar</b>.</li></ol>
      <p class="small muted">Si usas Chrome en iPhone: menú <b>Compartir</b> ↑ → <b>Agregar a la pantalla de inicio</b>.</p>`;
  }
  if (isSamsung) {
    return `<ol><li>Toca el menú <b>≡</b> abajo a la derecha.</li><li>Elige <b>Agregar página a</b> → <b>Pantalla de inicio</b>.</li></ol>`;
  }
  return `<ol><li>Toca el menú <b>⋮</b> arriba a la derecha de Chrome.</li>
    <li>Elige <b>Agregar a la pantalla principal</b> (o <b>Instalar app</b>).</li><li>Toca <b>Instalar</b>.</li></ol>
    <p class="small muted">Si no aparece, recarga la página una vez y espera unos segundos.</p>`;
}

export async function install() {
  if (deferred) {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome !== 'accepted') toast('Puedes instalarla cuando quieras desde Ajustes');
    rerender();
    return;
  }
  sheet(`<div class="stack"><h2>📲 Instalar Brío</h2>${steps()}
    <button class="btn btn-primary btn-block" data-close>Entendido</button></div>`, { label: 'Cómo instalar' });
}

export const installCard = () => (isInstalled() ? '' : `
  <div class="card row" style="border-color:var(--primary)">
    <span class="list-ico">📲</span>
    <span class="grow"><b>Instala Brío</b><br><span class="small muted">Úsala sin internet, como una app más</span></span>
    <button class="btn btn-primary btn-sm" data-install>Instalar</button>
  </div>`);

export const wireInstall = (root) =>
  root.querySelectorAll('[data-install]').forEach((b) => b.addEventListener('click', install));
