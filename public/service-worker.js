const nomeCache = "beba-agua-v10";
const arquivosEssenciais = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./img/icone-copo.svg",
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

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const endereco = evento.notification.data?.endereco || self.registration.scope;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const janelaAberta = janelas.find((janela) => "focus" in janela);
      if (janelaAberta) {
        return janelaAberta.navigate(endereco).then(() => janelaAberta.focus());
      }
      return self.clients.openWindow(endereco);
    })
  );
});
