# 293 — Ações das mensagens dos chats

> Task solta aprovada e implementada em 2026-10-31, após comparar mockups. Pesquisa na internet fica na spec 294, no backlog. Evidências e limites em [verificacao.md](293-acoes-das-mensagens-dos-chats/verificacao.md).

## Objetivo

Manter o horário das mensagens estável e tornar as ações discretas nos dois chats. No chat entre colaboradores, substituir Responder/Copiar no rodapé por um menu de ações.

## Entregáveis

1. Chat da IA: Copiar antes do horário nas mensagens próprias; recebidas mantêm horário à esquerda e Copiar após os metadados. Visível somente no hover da mensagem ou foco de teclado, sem deslocar o horário; preservar a cópia do Markdown.
2. Chat entre colaboradores: menu PrimeNG com Responder e Copiar texto, aberto pelo botão direito sobre a mensagem ou pelos três pontinhos no rodapé. Mensagens próprias têm ações antes do horário e da leitura; recebidas, depois. O botão só aparece no hover/foco ou enquanto o menu estiver aberto; seu espaço fica reservado. Preservar feedback de cópia, resposta/cancelamento, citações e ações de reenvio das mensagens que falharam. Não oferecer menu em mensagem de sistema ou ainda não enviada.
3. Mesmo comportamento no popup do Project e na janela de chat do Project Desktop, que usa o mesmo componente. Menu acessível por teclado, encerrado ao sair da conversa; não deslocar a data nem ultrapassar a janela. Clicar novamente nos três pontinhos da mesma mensagem fecha o menu; clicar nos de outra mensagem troca o alvo (ajuste solicitado durante a implementação).

## Critérios de Aceite

- Testes de componente verificam abertura do menu, alvo correto da cópia e resposta em mensagens próprias/recebidas, exclusão de mensagens sem ações e regressões das citações. Teste do chat da IA confere a ordem dos controles.
- Testes e build do frontend aprovados; `npm run repo:verificar` aprovado. Projeto sem lint (P-001).
- Aplicação real inspecionada em 1920×1080, 1366×768 e 1080×1920, claro/escuro: hover, foco, estabilidade das datas, menu por botão direito e três pontos, Copiar/Responder/Cancelar, mensagens curtas/longas, bordas do popup e janela `/chat-popup`.
- Análogos: os próprios balões e rodapés atuais dos chats; menu PrimeNG já usado em Minhas demandas e no pad. Não introduzir estilo global nem paleta paralela.

## Fora de Escopo

Pesquisa na internet, fontes e custos; menus no chat da IA (permanece botão Copiar); loadings e seletor Perguntas/Planejamento em histórico; novas ações ou alterações de API/permissão.

## Dependências

`SYSTEM.SPEC.md` §3.1, §8 e §12 (chat/mensagem-direta), `CONVENTIONS.md`; funcionalidades de cópia e resposta existentes (tasks 193, 219 e 220).
