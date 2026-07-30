const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const raiz = resolve(__dirname, "..");
const publicDir = resolve(raiz, "public");
const obrigatorios = [
  "index.html",
  "css/style.css",
  "js/app.js",
  "service-worker.js",
  "manifest.webmanifest",
  "img/icone-192.png",
  "img/icone-512.png",
];

for (const arquivo of obrigatorios) {
  if (!existsSync(resolve(publicDir, arquivo))) {
    throw new Error(`Arquivo obrigatório ausente: public/${arquivo}`);
  }
}

const manifesto = JSON.parse(
  readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf8"),
);
for (const campo of ["name", "short_name", "start_url", "scope", "display", "icons"]) {
  if (!manifesto[campo]) throw new Error(`Campo ausente no manifesto: ${campo}`);
}
for (const icone of manifesto.icons) {
  if (!existsSync(resolve(publicDir, icone.src))) {
    throw new Error(`Ícone do manifesto ausente: ${icone.src}`);
  }
}
console.log("PWA validada: manifesto, arquivos essenciais e ícones estão corretos.");
