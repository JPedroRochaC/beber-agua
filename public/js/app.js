const chaveDados = "meu-lembrete-agua";
const dadosPadrao = {
  perfil: null,
  configuracoes: {
    notificacoesAtivas: false,
    lembretesPausados: false,
    adiamento: 10,
    intervaloPadrao: 60,
  },
  registros: {},
  proximoLembrete: null,
};
let dados = carregarDados();
let relogioLembrete;
let temporizadorMensagem;
let eventoInstalacaoPendente;
let recarregandoAplicativo = false;

const elementos = Object.fromEntries(
  [...document.querySelectorAll("[id]")].map((elemento) => [
    elemento.id,
    elemento,
  ]),
);

function carregarDados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(chaveDados));
    if (salvos) {
      const precisaAtualizarIntervalo = !salvos.configuracoes?.intervaloPadrao;
      const dadosCarregados = {
        ...dadosPadrao,
        ...salvos,
        configuracoes: {
          ...dadosPadrao.configuracoes,
          ...salvos.configuracoes,
        },
      };
      if (precisaAtualizarIntervalo) {
        dadosCarregados.proximoLembrete = new Date(
          Date.now() + dadosCarregados.configuracoes.intervaloPadrao * 60000,
        ).toISOString();
      }
      return dadosCarregados;
    }
    return structuredClone(dadosPadrao);
  } catch {
    return structuredClone(dadosPadrao);
  }
}

function salvarDados() {
  localStorage.setItem(chaveDados, JSON.stringify(dados));
}
function obterDataLocal(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
function obterRegistrosHoje() {
  return dados.registros[obterDataLocal()] || [];
}
function calcularMeta(peso) {
  return (
    Math.round(Math.min(4000, Math.max(1500, Number(peso) * 35)) / 50) * 50
  );
}
function calcularImc(peso, altura) {
  return Number((Number(peso) / (Number(altura) / 100) ** 2).toFixed(1));
}
function formatarVolume(valor) {
  return valor >= 1000
    ? `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`
    : `${valor.toLocaleString("pt-BR")} ml`;
}
function formatarHorario(data) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function calcularIntervalo() {
  return dados.configuracoes.intervaloPadrao;
}

function calcularQuantidadePorLembrete() {
  const perfil = dados.perfil;
  const [horaAcordar, minutoAcordar] = perfil.horaAcordar
    .split(":")
    .map(Number);
  const [horaDormir, minutoDormir] = perfil.horaDormir.split(":").map(Number);
  let minutosAcordado =
    horaDormir * 60 + minutoDormir - (horaAcordar * 60 + minutoAcordar);
  if (minutosAcordado <= 0) minutosAcordado += 1440;
  const quantidadeDeLembretes = Math.max(
    1,
    Math.floor(minutosAcordado / calcularIntervalo()),
  );
  const quantidadeCalculada =
    Math.round(perfil.metaDiaria / quantidadeDeLembretes / 25) * 25;
  return Math.min(obterResumo().restante, Math.max(50, quantidadeCalculada));
}

function obterResumo() {
  const totalConsumido = obterRegistrosHoje().reduce(
    (total, registro) => total + Number(registro.quantidade),
    0,
  );
  return {
    totalConsumido,
    restante: Math.max(0, dados.perfil.metaDiaria - totalConsumido),
    porcentagem: Math.round((totalConsumido / dados.perfil.metaDiaria) * 100),
  };
}

function mostrarMensagem(texto) {
  elementos.mensagem.textContent = texto;
  elementos.mensagem.classList.add("visivel");
  clearTimeout(temporizadorMensagem);
  temporizadorMensagem = setTimeout(
    () => elementos.mensagem.classList.remove("visivel"),
    2800,
  );
}

function atualizarPrevisao() {
  const peso = Number(elementos.peso.value);
  const altura = Number(elementos.altura.value);
  if (!peso || !altura) {
    elementos["previsao-meta"].innerHTML =
      "<span>Meta estimada</span><strong>Preencha peso e altura</strong>";
    return;
  }
  elementos["previsao-meta"].innerHTML =
    `<span>Meta estimada • IMC ${calcularImc(peso, altura)}</span><strong>${formatarVolume(calcularMeta(peso))} / dia</strong>`;
}

function iniciarPerfil(evento) {
  evento.preventDefault();
  const formulario = new FormData(evento.currentTarget);
  dados.perfil = {
    nome: formulario.get("nome").trim(),
    peso: Number(formulario.get("peso")),
    altura: Number(formulario.get("altura")),
    horaAcordar: formulario.get("horaAcordar"),
    horaDormir: formulario.get("horaDormir"),
    volumePadrao: Number(formulario.get("volumePadrao")),
    metaDiaria: calcularMeta(formulario.get("peso")),
  };
  dados.proximoLembrete = criarProximoLembrete().toISOString();
  salvarDados();
  exibirAplicativo();
  mostrarMensagem("Seu plano de hidratação foi criado.");
}

function registrarConsumo(quantidade) {
  quantidade = Number(quantidade);
  if (!quantidade || quantidade < 1 || quantidade > 2000) {
    mostrarMensagem("Informe uma quantidade entre 1 e 2.000 ml.");
    return;
  }
  const chaveHoje = obterDataLocal();
  if (!dados.registros[chaveHoje]) dados.registros[chaveHoje] = [];
  dados.registros[chaveHoje].push({
    id: crypto.randomUUID(),
    quantidade,
    criadoEm: new Date().toISOString(),
  });
  elementos["lembrete-pendente"].classList.add("oculto");
  definirPulsoSino(false);
  dados.proximoLembrete = criarProximoLembrete().toISOString();
  salvarDados();
  atualizarPainel();
  mostrarMensagem(`${formatarVolume(quantidade)} registrados. Boa!`);
}

function adiarLembrete(minutos = dados.configuracoes.adiamento) {
  elementos["lembrete-pendente"].classList.add("oculto");
  definirPulsoSino(false);
  dados.proximoLembrete = criarProximoLembrete(minutos).toISOString();
  salvarDados();
  atualizarProximoLembrete();
  mostrarMensagem(`Lembrete adiado por ${minutos} minutos.`);
}

function executarAcaoNotificacao(acao) {
  if (!dados.perfil) return;
  if (acao === "beber-200") registrarConsumo(200);
  if (acao === "adiar-10") adiarLembrete(10);
}

function processarAcaoPendenteNaUrl() {
  const endereco = new URL(window.location.href);
  const acao = endereco.searchParams.get("acao");
  if (!acao) return;
  endereco.searchParams.delete("acao");
  window.history.replaceState({}, "", endereco);
  executarAcaoNotificacao(acao);
}

function excluirRegistro(identificador) {
  dados.registros[obterDataLocal()] = obterRegistrosHoje().filter(
    (registro) => registro.id !== identificador,
  );
  salvarDados();
  atualizarPainel();
  mostrarMensagem("Registro removido.");
}

function criarProximoLembrete(minutos = calcularIntervalo()) {
  return new Date(Date.now() + minutos * 60000);
}

// FIX pulsar: liga/desliga a classe .pulsando no sino do cabeçalho,
// espelhando o estado do toast "lembrete-pendente".
function definirPulsoSino(ativo) {
  elementos["botao-notificacoes"]?.classList.toggle("pulsando", ativo);
}

function animarNotificacaoAtivada() {
  const botao = elementos["botao-notificacoes"];
  if (!botao) return;
  botao.classList.remove("notificacao-confirmada");
  void botao.offsetWidth;
  botao.classList.add("notificacao-confirmada");
  window.setTimeout(
    () => botao.classList.remove("notificacao-confirmada"),
    900,
  );
}

function atualizarPainel() {
  const resumo = obterResumo();
  const metaAtingida = resumo.porcentagem >= 100;
  elementos["total-consumido"].textContent = formatarVolume(
    resumo.totalConsumido,
  );
  elementos["meta-diaria"].textContent = formatarVolume(
    dados.perfil.metaDiaria,
  );
  elementos["quantidade-restante"].textContent = formatarVolume(
    resumo.restante,
  );
  elementos.porcentagem.textContent = `${resumo.porcentagem}%`;
  elementos["anel-progresso"].style.setProperty(
    "--progresso",
    `${Math.min(100, resumo.porcentagem) * 3.6}deg`,
  );
  elementos["estado-meta"].textContent = metaAtingida
    ? "Meta concluída"
    : "Em andamento";
  elementos["titulo-saudacao"].textContent = `Olá, ${dados.perfil.nome}.`;
  elementos["data-atual"].textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();
  atualizarHistorico();
  atualizarOpcoes();
  atualizarEstadoNotificacoes();
  atualizarProximoLembrete();
}

function atualizarHistorico() {
  const registros = [...obterRegistrosHoje()].reverse();
  elementos["contador-registros"].textContent =
    `${registros.length} ${registros.length === 1 ? "registro" : "registros"}`;
  elementos["historico-vazio"].classList.toggle("oculto", registros.length > 0);
  elementos["lista-historico"].innerHTML = registros
    .map(
      (registro) =>
        `<li class="item-historico"><span class="item-historico__icone">●</span><strong>${formatarVolume(registro.quantidade)}</strong><time>${formatarHorario(new Date(registro.criadoEm))}</time><button type="button" data-excluir="${registro.id}" aria-label="Excluir registro">×</button></li>`,
    )
    .join("");
}

function atualizarOpcoes() {
  const padrao = dados.perfil.volumePadrao;
  const volumes = [...new Set([150, 250, padrao, 500])].sort((a, b) => a - b);
  elementos["opcoes-volume"].innerHTML = volumes
    .map(
      (volume) =>
        `<button class="opcao-volume" type="button" data-volume="${volume}">${volume} ml</button>`,
    )
    .join("");
}

function atualizarEstadoNotificacoes() {
  const permissao =
    "Notification" in window ? Notification.permission : "indisponivel";
  const botao = elementos["botao-notificacoes"];
  const notificacoesAtivas =
    permissao === "granted" && dados.configuracoes.notificacoesAtivas;

  const textoNotificacoes =
    permissao === "indisponivel"
      ? "Lembretes indisponíveis"
      : permissao === "denied"
        ? "Notificações bloqueadas pelo navegador"
        : notificacoesAtivas
          ? "Lembretes ativados"
          : permissao === "granted"
            ? "Lembretes desativados"
            : "Ativar lembretes";

  elementos["texto-botao-notificacoes"].textContent = textoNotificacoes;

  botao?.classList.toggle("notificacoes-ativas", notificacoesAtivas);
  botao?.classList.toggle(
    "notificacoes-desativadas",
    permissao === "granted" && !notificacoesAtivas,
  );
  botao?.setAttribute("aria-pressed", String(notificacoesAtivas));
  botao?.setAttribute("aria-label", textoNotificacoes);
  botao?.setAttribute("title", textoNotificacoes);
  elementos["botao-pausar"].textContent = dados.configuracoes.lembretesPausados
    ? "Retomar lembretes"
    : "Pausar lembretes";
}

function sincronizarPermissaoNotificacoes() {
  if (!("Notification" in window)) return;
  if (
    Notification.permission !== "granted" &&
    dados.configuracoes.notificacoesAtivas
  ) {
    dados.configuracoes.notificacoesAtivas = false;
    dados.configuracoes.lembretesPausados = false;
    elementos["lembrete-pendente"].classList.add("oculto");
    definirPulsoSino(false);
    salvarDados();
  }
  if (dados.perfil) {
    atualizarEstadoNotificacoes();
    atualizarProximoLembrete();
  }
}

function atualizarProximoLembrete() {
  const resumo = obterResumo();
  if (resumo.porcentagem >= 100) {
    elementos["proximo-lembrete"].textContent = "✓";
    elementos["texto-lembrete"].textContent =
      "Meta concluída. Os lembretes de hoje terminaram.";
    return;
  }
  if (!dados.configuracoes.notificacoesAtivas) {
    elementos["proximo-lembrete"].textContent = "—";
    elementos["texto-lembrete"].textContent =
      "Lembretes desativados. Ative o sino para receber avisos.";
    return;
  }
  if (dados.configuracoes.lembretesPausados) {
    elementos["proximo-lembrete"].textContent = "—";
    elementos["texto-lembrete"].textContent = "Seus lembretes estão pausados.";
    return;
  }
  if (
    !dados.proximoLembrete ||
    new Date(dados.proximoLembrete).toString() === "Invalid Date"
  ) {
    dados.proximoLembrete = criarProximoLembrete().toISOString();
    salvarDados();
  }
  elementos["proximo-lembrete"].textContent = formatarHorario(
    new Date(dados.proximoLembrete),
  );
  elementos["texto-lembrete"].textContent =
    `${formatarVolume(calcularQuantidadePorLembrete())} por lembrete • a cada ${calcularIntervalo()} minutos.`;
}

function verificarLembrete() {
  if (
    !dados.perfil ||
    !dados.configuracoes.notificacoesAtivas ||
    dados.configuracoes.lembretesPausados ||
    obterResumo().porcentagem >= 100 ||
    !dados.proximoLembrete
  )
    return;
  if (Date.now() < new Date(dados.proximoLembrete).getTime()) return;
  elementos["lembrete-pendente"].classList.remove("oculto");
  definirPulsoSino(true);
  if (
    dados.configuracoes.notificacoesAtivas &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const opcoesNotificacao = {
      body: `${dados.perfil.nome}, faltam ${formatarVolume(obterResumo().restante)} para sua meta de hoje.`,
      tag: "lembrete-agua",
      renotify: true,
      icon: new URL("img/icone-192.png", document.baseURI).href,
      data: { endereco: new URL(".", document.baseURI).href },
      actions: [
        { action: "beber-200", title: "Já bebi 200 ml" },
        { action: "adiar-10", title: "Adiar 10 min" },
      ],
      requireInteraction: true,
      timestamp: Date.now(),
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registro) =>
        registro.showNotification("Hora de beber água 💧", opcoesNotificacao),
      );
    } else {
      const aviso = new Notification("Hora de beber água 💧", opcoesNotificacao);
      aviso.onclick = () => window.focus();
    }
  }
  dados.proximoLembrete = criarProximoLembrete(
    dados.configuracoes.adiamento,
  ).toISOString();
  salvarDados();
  atualizarProximoLembrete();
}

async function ativarNotificacoes() {
  if (!("Notification" in window)) {
    mostrarMensagem("Este navegador não oferece notificações.");
    return;
  }

  if (
    Notification.permission === "granted" &&
    dados.configuracoes.notificacoesAtivas
  ) {
    dados.configuracoes.notificacoesAtivas = false;
    elementos["lembrete-pendente"].classList.add("oculto");
    definirPulsoSino(false);
    salvarDados();
    atualizarEstadoNotificacoes();
    atualizarProximoLembrete();
    mostrarMensagem("Lembretes desativados.");
    return;
  }

  const permissao =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  dados.configuracoes.notificacoesAtivas = permissao === "granted";
  if (dados.configuracoes.notificacoesAtivas) {
    dados.proximoLembrete = criarProximoLembrete().toISOString();
  }
  salvarDados();
  atualizarEstadoNotificacoes();
  atualizarProximoLembrete();
  if (permissao === "granted") {
    animarNotificacaoAtivada();
  }
  mostrarMensagem(
    permissao === "granted"
      ? "Lembretes ativados."
      : "Permissão de notificação não concedida.",
  );
}

function alternarPausa() {
  dados.configuracoes.lembretesPausados =
    !dados.configuracoes.lembretesPausados;
  if (!dados.configuracoes.lembretesPausados)
    dados.proximoLembrete = criarProximoLembrete().toISOString();
  salvarDados();
  atualizarPainel();
}

function abrirConfiguracoes() {
  const perfil = dados.perfil;
  elementos["formulario-configuracoes"].innerHTML =
    `<label class="campo campo--inteiro"><span>Nome</span><input name="nome" value="${perfil.nome}" required></label><label class="campo"><span>Peso (kg)</span><input name="peso" type="number" min="30" max="250" step="0.1" value="${perfil.peso}" required></label><label class="campo"><span>Altura (cm)</span><input name="altura" type="number" min="120" max="230" value="${perfil.altura}" required></label><label class="campo"><span>Acordo às</span><input name="horaAcordar" type="time" value="${perfil.horaAcordar}" required></label><label class="campo"><span>Durmo às</span><input name="horaDormir" type="time" value="${perfil.horaDormir}" required></label><label class="campo"><span>Volume da garrafa (ml)</span><input name="volumePadrao" type="number" min="50" max="1500" value="${perfil.volumePadrao}" required></label><label class="campo"><span>Meta diária (ml)</span><input name="metaDiaria" type="number" min="500" max="6000" value="${perfil.metaDiaria}" required></label><label class="campo"><span>Intervalo dos lembretes (minutos)</span><input name="intervaloPadrao" type="number" min="30" max="180" step="15" value="${dados.configuracoes.intervaloPadrao}" required></label><label class="campo"><span>Adiar por (minutos)</span><input name="adiamento" type="number" min="1" max="120" value="${dados.configuracoes.adiamento}" required></label><button class="botao-principal" type="submit">Salvar configurações</button>`;
  elementos.sobreposicao.classList.remove("oculto");
  elementos["modal-configuracoes"].classList.remove("oculto");
  elementos.sobreposicao.setAttribute("aria-hidden", "false");
}

function fecharConfiguracoes() {
  elementos.sobreposicao.classList.add("oculto");
  elementos["modal-configuracoes"].classList.add("oculto");
  elementos.sobreposicao.setAttribute("aria-hidden", "true");
}

function salvarConfiguracoes(evento) {
  evento.preventDefault();
  const formulario = new FormData(evento.currentTarget);
  dados.perfil = {
    nome: formulario.get("nome").trim(),
    peso: Number(formulario.get("peso")),
    altura: Number(formulario.get("altura")),
    horaAcordar: formulario.get("horaAcordar"),
    horaDormir: formulario.get("horaDormir"),
    volumePadrao: Number(formulario.get("volumePadrao")),
    metaDiaria: Number(formulario.get("metaDiaria")),
  };
  dados.configuracoes.adiamento = Number(formulario.get("adiamento"));
  dados.configuracoes.intervaloPadrao = Number(
    formulario.get("intervaloPadrao"),
  );
  dados.proximoLembrete = criarProximoLembrete().toISOString();
  salvarDados();
  fecharConfiguracoes();
  atualizarPainel();
  mostrarMensagem("Configurações atualizadas.");
}

function exibirAplicativo() {
  const configurado = Boolean(dados.perfil);
  elementos["tela-inicial"].classList.toggle("oculto", configurado);
  elementos.painel.classList.toggle("oculto", !configurado);
  elementos["botao-configuracoes"].classList.toggle("oculto", !configurado);
  if (configurado) atualizarPainel();
}

elementos.peso.addEventListener("input", atualizarPrevisao);
elementos.altura.addEventListener("input", atualizarPrevisao);
elementos["formulario-perfil"].addEventListener("submit", iniciarPerfil);
elementos["formulario-registro"].addEventListener("submit", (evento) => {
  evento.preventDefault();
  registrarConsumo(elementos["quantidade-personalizada"].value);
  evento.currentTarget.reset();
});
elementos["opcoes-volume"].addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-volume]");
  if (botao) registrarConsumo(botao.dataset.volume);
});
elementos["lista-historico"].addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-excluir]");
  if (botao) excluirRegistro(botao.dataset.excluir);
});
elementos["botao-notificacoes"].addEventListener("click", ativarNotificacoes);
elementos["botao-instalar"]?.addEventListener("click", async () => {
  if (!eventoInstalacaoPendente) return;
  eventoInstalacaoPendente.prompt();
  const escolha = await eventoInstalacaoPendente.userChoice;
  eventoInstalacaoPendente = null;
  elementos["botao-instalar"].classList.add("oculto");
  if (escolha.outcome === "accepted") {
    mostrarMensagem("Aplicativo instalado com sucesso.");
  }
});
elementos["botao-pausar"].addEventListener("click", alternarPausa);
elementos["confirmar-lembrete"].addEventListener("click", () =>
  registrarConsumo(calcularQuantidadePorLembrete()),
);
elementos["adiar-lembrete"].addEventListener("click", () => {
  adiarLembrete();
});
elementos["botao-configuracoes"].addEventListener("click", abrirConfiguracoes);
elementos["fechar-configuracoes"].addEventListener(
  "click",
  fecharConfiguracoes,
);
elementos.sobreposicao.addEventListener("click", fecharConfiguracoes);
elementos["formulario-configuracoes"].addEventListener(
  "submit",
  salvarConfiguracoes,
);

exibirAplicativo();
processarAcaoPendenteNaUrl();
window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (evento) => {
    executarAcaoNotificacao(evento.data?.acao);
  });
}

window.addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  eventoInstalacaoPendente = evento;
  elementos["botao-instalar"]?.classList.remove("oculto");
});
window.addEventListener("appinstalled", () => {
  eventoInstalacaoPendente = null;
  elementos["botao-instalar"]?.classList.add("oculto");
  mostrarMensagem("Aplicativo instalado com sucesso.");
});
window.addEventListener("focus", () => {
  sincronizarPermissaoNotificacoes();
  verificarLembrete();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    sincronizarPermissaoNotificacoes();
    verificarLembrete();
  }
});
window.addEventListener("online", () =>
  mostrarMensagem("Conexão restabelecida."),
);
window.addEventListener("offline", () =>
  mostrarMensagem("Você está offline. Seus dados continuam disponíveis."),
);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregandoAplicativo) return;
    recarregandoAplicativo = true;
    window.location.reload();
  });
  window.addEventListener("load", async () => {
    try {
      const registro =
        await navigator.serviceWorker.register("service-worker.js");
      await registro.update();
    } catch {
      mostrarMensagem("Não foi possível ativar o modo de aplicativo.");
    }
  });
}
relogioLembrete = setInterval(verificarLembrete, 15000);
window.addEventListener("beforeunload", () => clearInterval(relogioLembrete));
