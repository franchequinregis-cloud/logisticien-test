// #LOGISTICIEN — service worker de test (version test-1)
const CACHE = 'logisticien-test-v1';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(
        cles.filter((k) => k.startsWith('logisticien-test-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname.endsWith('/partage-recu')) {
    e.respondWith(recevoirPartage(req));
    return;
  }
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req))
  );
});

// Fichier reçu depuis le menu « Partager » d'Android (WhatsApp, etc.)
async function recevoirPartage(req) {
  let enregistre = { erreur: 'aucun fichier reçu' };
  try {
    const fd = await req.formData();
    const f = fd.get('fichier');
    if (f && typeof f.text === 'function') {
      enregistre = { nom: f.name || '', taille: f.size || 0, type: f.type || '', texte: await f.text() };
    }
  } catch (err) {
    enregistre = { erreur: String(err && err.message ? err.message : err) };
  }
  const c = await caches.open('recu-test');
  await c.put('recu.json', new Response(JSON.stringify(enregistre), {
    headers: { 'Content-Type': 'application/json' }
  }));
  return Response.redirect(new URL('./?recu=1', self.registration.scope).href, 303);
}
