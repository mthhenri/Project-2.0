# 274 — Conversas fictícias e limpeza do OpenSearch local

## Objetivo
Ampliar o seed de desenvolvimento com conversas entre os usuários fictícios e com o administrador inicial e alinhar o OpenSearch local ao PostgreSQL recriado.

## Entregáveis
1. Seed repetível de 12 conversas e 72 mensagens diretas, com Markdown, código e respostas, usando os usuários reais do cenário 273. IDs estáveis, datas históricas e nenhuma chamada a provedores de IA.
2. Comando separado db:seed-conversas e inclusão no CLI db:seed-historico. Só development, OpenSearch local, sem SSL/production; antes de escrever, verificar participantes ativos e respectivos tipos.
3. Opção explícita --limpar-opensearch que elimina e recria somente chat-mensagem, chat-conversa e mensagem-direta com os mapeamentos canônicos. Execução comum nunca limpa índices. A limpeza e aplicação local foram autorizadas pelo autor nesta tarefa.
4. Documentação, testes e aplicação efetiva no OpenSearch local. Sem novo reset PostgreSQL.

## Critérios de Aceite
Testes de segurança e de plano determinístico, build e suíte backend, execução local com contagens 12/72 e repetição sem duplicação. Conferir leituras pelo armazenamento real e ausência dos documentos antigos nos três índices após recriação. repo:verificar e revisão de convenções.

## Fora de Escopo
UI, novas regras de chat, mensagens da IA fictícias, PostgreSQL/Elasticsearch como destino deste seed, apagar volumes ou índices de outras aplicações, commit ou push.

## Dependências
Task 273, SCHEMA.md, contratos e mapeamentos do chat entre colaboradores e do chat IA.
