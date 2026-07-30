# Gota a gota

Aplicativo pessoal de hidratação feito com HTML, CSS, JavaScript, Node.js e Express.

## Como executar

É necessário ter o Node.js instalado.

```bash
npm install
npm run iniciar
```

Depois, abra `http://localhost:3000` no navegador.

## O que o aplicativo faz

- Calcula uma meta estimada usando 35 ml por quilo, limitada inicialmente entre 1,5 e 4 litros.
- Distribui lembretes entre os horários de acordar e dormir.
- Registra o consumo e mantém o histórico diário no navegador.
- Repete o aviso até a confirmação ou o adiamento.
- Permite ajustar manualmente a meta e as preferências.
- Pode ser instalado como PWA no celular ou computador.
- Continua abrindo e exibindo os dados principais sem internet após o primeiro acesso.

## Instalação no celular

Abra o endereço do aplicativo no navegador e use a opção **Adicionar à tela inicial** ou **Instalar aplicativo**. Em iPhones, use o Safari e a opção **Adicionar à Tela de Início** no menu de compartilhamento.

O PWA possui Service Worker e suporta notificações do sistema. Para receber lembretes programados depois que o navegador e o aplicativo forem completamente encerrados, ainda é necessário configurar Web Push com um servidor publicado.

> A meta é uma estimativa geral para adultos saudáveis e não substitui orientação profissional.

## Privacidade

Todos os dados ficam somente no `localStorage` do navegador utilizado. Não há conta, banco de dados ou envio de informações para servidores externos.
