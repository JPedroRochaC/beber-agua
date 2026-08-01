const nomeCache = "beba-agua-v14";
const arquivosEssenciais = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./img/icone-copo.svg",
  "./img/icone-maskable.svg",
  "./img/icone-192.png",
  "./img/icone-512.png",
  "./img/icone-180.png"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(nomeCache).then((cache) => cache.addAll(arquivosEssenciais))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== nomeCache).map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  if (
    evento.request.method !== "GET" ||
    !evento.request.url.startsWith(self.location.origin)
  ) return;

  const endereco = new URL(evento.request.url);
  if (endereco.pathname.startsWith("/api/") || endereco.pathname === "/status") {
    evento.respondWith(fetch(evento.request));
    return;
  }

  if (evento.request.mode === "navigate") {
    evento.respondWith(
      fetch(evento.request)
        .then((resposta) => {
          const copia = resposta.clone();
          evento.waitUntil(
            caches.open(nomeCache).then((cache) => cache.put("./index.html", copia)),
          );
          return resposta;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((armazenada) => {
      const atualizacao = fetch(evento.request).then((resposta) => {
        if (resposta.ok && resposta.type === "basic") {
          const copia = resposta.clone();
          evento.waitUntil(
            caches.open(nomeCache).then((cache) => cache.put(evento.request, copia)),
          );
        }
        return resposta;
      });
      return armazenada || atualizacao;
    }),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data?.json() || {};
  } catch {
    dados = { corpo: evento.data?.text() || "Hora de beber água." };
  }

  const opcoes = {
    body: dados.corpo || "Hora de beber água.",
    icon: dados.icon || "./img/icone-192.png",
    badge: dados.badge || "./img/icone-192.png",
    tag: dados.tag || "lembrete-agua",
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    data: {
      endereco: dados.endereco || self.registration.scope,
      quantidade: dados.quantidade || 200,
    },
    actions: [
      { action: "beber-quantidade", title: `Já bebi ${dados.quantidade || 200} ml` },
      { action: "adiar-10", title: "Adiar 10 min" },
    ],
  };

  evento.waitUntil(
    Promise.all([
      self.registration.showNotification(
        dados.titulo || "Hora de beber água",
        opcoes,
      ),
      "setAppBadge" in self.navigator
        ? self.navigator.setAppBadge(1)
        : Promise.resolve(),
    ]),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const enderecoBase = evento.notification.data?.endereco || self.registration.scope;
  const endereco = new URL(enderecoBase);
  let acao = evento.action;
  if (acao === "beber-quantidade") {
    acao = `beber-${evento.notification.data?.quantidade || 200}`;
  }
  if (acao) endereco.searchParams.set("acao", acao);
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const janelaAberta = janelas.find((janela) => "focus" in janela);
      if (janelaAberta) {
        if (acao) janelaAberta.postMessage({ acao });
        return janelaAberta.focus();
      }
      return self.clients.openWindow(endereco.href);
    })
  );
});
