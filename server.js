const caminho = require("node:path");
const express = require("express");

const aplicativo = express();
const porta = Number(process.env.PORTA) || 3000;
const pastaPublica = caminho.join(__dirname, "public");

aplicativo.disable("x-powered-by");
aplicativo.use(express.static(pastaPublica));

aplicativo.get("/{*caminho}", (_requisicao, resposta) => {
  resposta.sendFile(caminho.join(pastaPublica, "index.html"));
});

aplicativo.listen(porta, () => {
  console.log(`Lembrete de água disponível em http://localhost:${porta}`);
});
