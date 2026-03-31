// ═══════════════════════════════════════════════════════════
// service-worker.js — PWA Fissão de Conhecimento
// Cache First para assets locais, Network First para APIs.
// Notificação push para revisões pendentes do dia.
// ═══════════════════════════════════════════════════════════
 
const CACHE_NAME = 'fissao-v2';
 
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/variables.css',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/sections.css',
  '/assets/css/responsive.css',
  '/assets/js/main.js',
  '/assets/js/supabase.js',
  '/assets/js/storage.js',
  '/assets/js/state.js',
  '/assets/js/constants.js',
  '/assets/js/utils.js',
  '/assets/js/theme.js',
  '/assets/js/login.js',
  '/assets/js/dashboard.js',
  '/assets/js/dom.js',
  '/assets/js/navigation.js',
  '/assets/js/anki.js',
  '/assets/js/erros.js',
  '/assets/js/revisoes.js',
  '/assets/js/sessions.js',
  '/assets/js/simulado.js',
  '/assets/js/diagnostico.js',
  '/assets/js/decision.js',
  '/assets/js/enem.js',
  '/assets/js/redacao.js',
  '/assets/js/assistente.js',
  '/assets/js/onboarding.js',
  '/assets/js/plano-semanal.js',
  '/assets/js/access.js',
];
 
// ── Install ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
 
// ── Activate ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
 
// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
 
  // APIs externas: Network First
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
 
  // Assets locais: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
 
// ── Notificações push ─────────────────────────────────────
// Recebe mensagem do app com dados de revisões pendentes
self.addEventListener('message', event => {
  if (event.data?.tipo === 'verificar-revisoes') {
    const { pendentes, anki } = event.data;
 
    if (pendentes > 0 || anki > 0) {
      const partes = [];
      if (pendentes > 0) partes.push(`${pendentes} revisão${pendentes > 1 ? 'ões' : ''} pendente${pendentes > 1 ? 's' : ''}`);
      if (anki > 0)      partes.push(`${anki} cartão${anki > 1 ? 'ões' : ''} Anki`);
 
      self.registration.showNotification('⚛️ Fissão de Conhecimento', {
        body:    `Você tem ${partes.join(' e ')} para hoje!`,
        icon:    '/assets/img/icon-192.png',
        badge:   '/assets/img/icon-192.png',
        tag:     'revisoes-pendentes',
        renotify: false,
        data:    { url: '/' },
        actions: [
          { action: 'abrir', title: 'Abrir app' },
          { action: 'ignorar', title: 'Ignorar' },
        ],
      });
    }
  }
});
 
// Clique na notificação abre o app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'ignorar') return;
 
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const fissao = list.find(c => c.url.includes(self.registration.scope));
      if (fissao) return fissao.focus();
      return clients.openWindow('/');
    })
  );
});