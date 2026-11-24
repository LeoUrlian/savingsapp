/*
 * Service worker do SavingsApp. É de propósito MÍNIMO: só mostra uma página
 * "sem conexão" quando a rede cai ao abrir uma tela.
 *
 * NÃO guarda nenhuma resposta da API nem das páginas. São dados financeiros
 * de uma conta logada: um cache aqui poderia mostrar o saldo de uma pessoa a
 * outra no mesmo aparelho, depois do "Sair".
 */
const OFFLINE_CACHE = "savingsapp-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Só interfere em abrir uma página (navegação). O resto vai direto à rede.
  if (req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((res) => res ?? new Response("Sem conexão", { status: 503 })),
    ),
  );
});
