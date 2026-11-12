// Service worker: cachea el shell para funcionar sin conexión.
const CACHE = 'brio-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/install.js', './js/store.js', './js/util.js', './js/ui.js', './js/actions.js', './js/ui/art.js',
  './js/data/activities.js', './js/data/foods.js', './js/data/exercises.js', './js/data/cards.js',
  './js/logic/streak.js', './js/logic/stats.js', './js/logic/nutrition.js',
  './js/views/onboarding.js', './js/views/home.js', './js/views/log.js', './js/views/gps.js', './js/views/gym.js',
  './js/views/workout.js', './js/views/goals.js', './js/views/diet.js', './js/views/cards.js', './js/views/stats.js',
  './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (para recibir actualizaciones), caché si no hay conexión.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
