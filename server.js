const caminho = require("node:path");
const sistemaArquivos = require("node:fs");
const webPush = require("web-push");
const express = require("express");

const aplicativo = express();
const porta = Number(process.env.PORT || process.env.PORTA) || 3000;
const pastaPublica = caminho.join(__dirname, "public");
const arquivoConfiguracaoPush = process.env.ARQUIVO_CONFIG_PUSH
  ? caminho.resolve(process.env.ARQUIVO_CONFIG_PUSH)
  : caminho.join(__dirname, ".push-config.json");
const arquivoDados = process.env.ARQUIVO_DADOS_APP
  ? caminho.resolve(process.env.ARQUIVO_DADOS_APP)
  : caminho.join(__dirname, ".app-data.json");

function carregarJson(endereco, valorPadrao) {
  try {
    return JSON.parse(sistemaArquivos.readFileSync(endereco, "utf8"));
  } catch {
    return structuredClone(valorPadrao);
  }
}

function salvarJson(endereco, conteudo) {
  const temporario = `${endereco}.tmp`;
  sistemaArquivos.writeFileSync(temporario, JSON.stringify(conteudo, null, 2));
  sistemaArquivos.renameSync(temporario, endereco);
}

function carregarConfiguracaoPush() {
  const configuracaoSalva = carregarJson(arquivoConfiguracaoPush, null);
  if (configuracaoSalva?.chavePublica && configuracaoSalva?.chavePrivada) {
    return configuracaoSalva;
  }

  const chaves = webPush.generateVAPIDKeys();
  const configuracao = {
    chavePublica: chaves.publicKey,
    chavePrivada: chaves.privateKey,
  };
  salvarJson(arquivoConfiguracaoPush, configuracao);
  return configuracao;
}

const configuracaoPush = carregarConfiguracaoPush();
let armazenamento = carregarJson(arquivoDados, {
  dadosAplicativo: null,
  inscricoes: [],
});
let enviandoLembretes = false;

webPush.setVapidDetails(
  process.env.CONTATO_VAPID || "mailto:administrador@example.com",
  configuracaoPush.chavePublica,
  configuracaoPush.chavePrivada,
);

function salvarArmazenamento() {
  salvarJson(arquivoDados, armazenamento);
}

function obterPartesNoFuso(data, fusoHorario) {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario || "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatador
      .formatToParts(data)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, parte.value]),
  );
}

function estaNoPeriodoAcordado(dadosAplicativo, agora) {
  const perfil = dadosAplicativo.perfil;
  const partes = obterPartesNoFuso(agora, perfil.fusoHorario);
  const minutosAtuais = Number(partes.hour) * 60 + Number(partes.minute);
  const [horaAcordar, minutoAcordar] = perfil.horaAcordar.split(":").map(Number);
  const [horaDormir, minutoDormir] = perfil.horaDormir.split(":").map(Number);
  const inicio = horaAcordar * 60 + minutoAcordar;
  const fim = horaDormir * 60 + minutoDormir;
  return inicio < fim
    ? minutosAtuais >= inicio && minutosAtuais < fim
    : minutosAtuais >= inicio || minutosAtuais < fim;
}

function obterChaveData(dadosAplicativo, data = new Date()) {
  const partes = obterPartesNoFuso(data, dadosAplicativo.perfil.fusoHorario);
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function obterResumo(dadosAplicativo) {
  const registros = dadosAplicativo.registros?.[obterChaveData(dadosAplicativo)] || [];
  const totalConsumido = registros.reduce(
    (total, registro) => total + Number(registro.quantidade || 0),
    0,
  );
  return {
    totalConsumido,
    restante: Math.max(0, dadosAplicativo.perfil.metaDiaria - totalConsumido),
  };
}

function calcularQuantidadePorLembrete(dadosAplicativo) {
  const perfil = dadosAplicativo.perfil;
  const intervalo = dadosAplicativo.configuracoes.intervaloPadrao || 60;
  const [horaAcordar, minutoAcordar] = perfil.horaAcordar.split(":").map(Number);
  const [horaDormir, minutoDormir] = perfil.horaDormir.split(":").map(Number);
  let minutosAcordado =
    horaDormir * 60 + minutoDormir - (horaAcordar * 60 + minutoAcordar);
  if (minutosAcordado <= 0) minutosAcordado += 1440;
  const lembretes = Math.max(1, Math.floor(minutosAcordado / intervalo));
  const quantidade = Math.round(perfil.metaDiaria / lembretes / 25) * 25;
  return Math.min(obterResumo(dadosAplicativo).restante, Math.max(50, quantidade));
}

async function enviarLembretesPendentes() {
  if (enviandoLembretes) return;
  const dadosAplicativo = armazenamento.dadosAplicativo;
  if (
    !dadosAplicativo?.perfil ||
    dadosAplicativo.configuracoes?.lembretesPausados ||
    !dadosAplicativo.proximoLembrete ||
    armazenamento.inscricoes.length === 0
  ) return;

  const agora = new Date();
  if (
    agora.getTime() < new Date(dadosAplicativo.proximoLembrete).getTime() ||
    !estaNoPeriodoAcordado(dadosAplicativo, agora) ||
    obterResumo(dadosAplicativo).restante <= 0
  ) return;

  enviandoLembretes = true;
  const quantidade = calcularQuantidadePorLembrete(dadosAplicativo);
  const restante = obterResumo(dadosAplicativo).restante;
  const carga = JSON.stringify({
    titulo: "Hora de beber água",
    corpo: `${dadosAplicativo.perfil.nome}, beba ${quantidade} ml. Faltam ${restante} ml para sua meta de hoje.`,
    icon: "/img/icone-192.png",
    badge: "/img/icone-192.png",
    tag: "lembrete-agua",
    endereco: "/",
    quantidade,
  });

  const resultados = await Promise.allSettled(
    armazenamento.inscricoes.map((inscricao) =>
      webPush.sendNotification(inscricao, carga, { TTL: 300 }),
    ),
  );

  armazenamento.inscricoes = armazenamento.inscricoes.filter(
    (_inscricao, indice) => {
      const resultado = resultados[indice];
      const codigo = resultado.status === "rejected" ? resultado.reason?.statusCode : 0;
      return codigo !== 404 && codigo !== 410;
    },
  );
  const adiamento = Number(dadosAplicativo.configuracoes.adiamento) || 10;
  dadosAplicativo.proximoLembrete = new Date(
    agora.getTime() + adiamento * 60_000,
  ).toISOString();
  salvarArmazenamento();
  enviandoLembretes = false;
}

aplicativo.disable("x-powered-by");
aplicativo.use(express.json({ limit: "1mb" }));

aplicativo.get("/status", (_requisicao, resposta) => {
  resposta.json({ online: true, push: true });
});

aplicativo.get("/api/push/public-key", (_requisicao, resposta) => {
  resposta.set("Cache-Control", "no-store");
  resposta.json({ chavePublica: configuracaoPush.chavePublica });
});

aplicativo.post("/api/push/subscriptions", async (requisicao, resposta) => {
  const inscricao = requisicao.body;
  if (!inscricao?.endpoint || !inscricao?.keys?.p256dh || !inscricao?.keys?.auth) {
    return resposta.status(400).json({ erro: "Inscrição de push inválida." });
  }
  const indice = armazenamento.inscricoes.findIndex(
    (item) => item.endpoint === inscricao.endpoint,
  );
  if (indice >= 0) armazenamento.inscricoes[indice] = inscricao;
  else armazenamento.inscricoes.push(inscricao);
  salvarArmazenamento();
  try {
    await webPush.sendNotification(
      inscricao,
      JSON.stringify({
        titulo: "Notificações ativadas",
        corpo: "Este dispositivo receberá seus lembretes mesmo com o aplicativo fechado.",
        icon: "/img/icone-192.png",
        badge: "/img/icone-192.png",
        tag: "push-ativado",
        endereco: "/",
      }),
      { TTL: 60 },
    );
  } catch (erro) {
    console.warn("A inscrição foi salva, mas o push de confirmação falhou:", erro.message);
  }
  return resposta.status(201).json({ ok: true });
});

aplicativo.delete("/api/push/subscriptions", (requisicao, resposta) => {
  const endpoint = requisicao.body?.endpoint;
  armazenamento.inscricoes = armazenamento.inscricoes.filter(
    (item) => item.endpoint !== endpoint,
  );
  salvarArmazenamento();
  resposta.status(204).end();
});

aplicativo.get("/api/data", (_requisicao, resposta) => {
  resposta.set("Cache-Control", "no-store");
  resposta.json({ dados: armazenamento.dadosAplicativo });
});

aplicativo.put("/api/data", (requisicao, resposta) => {
  const novosDados = requisicao.body?.dados;
  if (!novosDados || typeof novosDados !== "object") {
    return resposta.status(400).json({ erro: "Dados inválidos." });
  }
  armazenamento.dadosAplicativo = novosDados;
  salvarArmazenamento();
  return resposta.json({ ok: true });
});

aplicativo.use(express.static(pastaPublica));
aplicativo.get("/{*caminho}", (_requisicao, resposta) => {
  resposta.sendFile(caminho.join(pastaPublica, "index.html"));
});

const servidor = aplicativo.listen(porta, () => {
  console.log(`Lembrete de água disponível em http://localhost:${porta}`);
  console.log("Web Push ativo. Em produção, use HTTPS e armazenamento persistente.");
});

const relogioServidor = setInterval(enviarLembretesPendentes, 30_000);
relogioServidor.unref();

function encerrarServidor() {
  clearInterval(relogioServidor);
  servidor.close(() => process.exit(0));
}

process.on("SIGINT", encerrarServidor);
process.on("SIGTERM", encerrarServidor);

module.exports = { aplicativo, enviarLembretesPendentes };
