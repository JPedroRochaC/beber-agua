<div align="center">

# Beba Água

### Acompanhamento diário e lembretes para uma rotina de hidratação

O Beba Água calcula uma meta estimada, registra o consumo e ajuda o usuário a manter a hidratação ao longo do dia.

<br>

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

</div>

---

## Sobre o projeto

O **Beba Água** é um aplicativo pessoal de hidratação desenvolvido para tornar o acompanhamento do consumo de água mais simples e visual.

A partir do peso informado, o aplicativo calcula uma meta diária estimada. O painel apresenta o volume consumido, a quantidade restante e o percentual alcançado durante o dia.

O usuário também pode definir seus horários, configurar o tamanho do copo ou da garrafa e ativar lembretes de hidratação.

Os dados ficam armazenados no próprio navegador, sem necessidade de cadastro ou conexão com banco de dados.

## Demonstração

### Painel de hidratação


![Painel principal do Beba Água](/public/img/painel.png)

## Funcionalidades

- Cálculo de meta diária estimada a partir do peso
- Registro rápido do consumo de água
- Indicador visual de progresso
- Exibição do volume consumido e restante
- Histórico diário de registros
- Exclusão de registros realizados
- Configuração do copo ou da garrafa
- Ajuste manual da meta diária
- Definição dos horários de acordar e dormir
- Intervalo configurável entre lembretes
- Opções para pausar e adiar lembretes
- Ativação e desativação dos avisos pelo aplicativo
- Funcionamento offline após o primeiro acesso
- Instalação no celular ou computador como PWA

## Status das funcionalidades

- ✅ Cálculo e acompanhamento da meta
- ✅ Registro e histórico diário
- ✅ Configurações personalizadas
- ✅ Lembretes enquanto o aplicativo está em execução
- ✅ Instalação como PWA
- ✅ Funcionamento offline
- ✅ Notificações locais com ações rápidas

## Tecnologias utilizadas

### Front-end

- HTML5
- CSS3
- JavaScript
- Lucide Icons
- Progressive Web App (PWA)

### Back-end

- Node.js
- Express

### Recursos do navegador

- Local Storage
- Notifications API
- Service Worker
- Web App Manifest

## Como executar

É necessário ter o [Node.js](https://nodejs.org/) instalado.

```bash
git clone https://github.com/JPedroRochaC/beber-agua.git
cd beber-agua
npm install
npm run iniciar
```

Depois, acesse `http://localhost:3000` no navegador.

Para executar com reinicialização automática durante o desenvolvimento:

```bash
npm run dev
```

## Estrutura do projeto

```text
beber-agua/
│
├── public/
│   ├── css/
│   ├── img/
│   ├── js/
│   ├── index.html
│   ├── manifest.webmanifest
│   └── service-worker.js
│
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Instalação como aplicativo

Abra o projeto em um navegador compatível e escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.

No iPhone, abra pelo Safari e selecione **Compartilhar → Adicionar à Tela de Início**.

As notificações funcionam enquanto o aplicativo está aberto ou ativo em segundo plano. Elas oferecem as ações **Já bebi 200 ml** e **Adiar 10 min**, conforme o suporte do navegador e do sistema operacional.

## Publicação no Render

Para este projeto, a configuração mais simples é publicar front-end e back-end juntos em um único **Web Service** no Render.

- Build command: `npm install`
- Start command: `npm run iniciar`
- Health check: `/status`

Não são necessárias chaves, banco de dados, disco persistente ou variáveis adicionais. O Render fornece automaticamente a variável `PORT` usada pelo servidor.

## Privacidade

O perfil, as configurações e os registros de consumo ficam somente no `localStorage` do navegador utilizado.

O aplicativo não possui conta, banco de dados ou envio de informações pessoais para serviços externos.

## Aviso

A meta diária apresentada é uma estimativa geral e não substitui orientação médica ou nutricional profissional.

## Próximas etapas

- Adicionar relatórios semanais e mensais
- Permitir exportação do histórico
- Melhorar a experiência de instalação no iPhone

## Autor

Desenvolvido por **Pedro Rocha**.

[![GitHub](https://img.shields.io/badge/GitHub-JPedroRochaC-181717?style=for-the-badge&logo=github)](https://github.com/JPedroRochaC)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Pedro_Rocha-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/pedro-rocha-646085342/)

[![Instagram](https://img.shields.io/badge/Instagram-@pedrocha.dev-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/pedrocha.dev/)

---

<div align="center">

**Beba Água — constância para transformar hidratação em hábito.**

</div>
