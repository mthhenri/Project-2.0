# 485-configuracoes-da-ia-prompts-so-ao-abrir-a-aba.spec.md

> Task 157/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-223 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-09.
> Severidade: Baixa. Área: frontend/configuracao-ia.

## Objetivo

Abrir a tela deixa de carregar os prompts antes de alguém pedir: a aba Prompts é montada quando for aberta, como a de Custos.

## Contexto

**A-223 · Baixa · Abrir Configurações da IA faz 6 requisições, entre elas os 14 prompts inteiros e as versões do prompt de conversa, antes de a aba Prompts ser aberta**

O painel da aba Custos já é montado só quando ativo (`@if (abaAtiva() === "custos")`), mas o da aba Prompts é montado junto com a página e pede `GET /prompt` (14,6 KB) e `GET /prompt/CONVERSA/versoes` na abertura, com a aba Provedor à frente.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/configuracao-ia/pages/configuracao-ia/configuracao-ia.page.html:155 — `<p-tabpanel value="prompts">` sem a guarda que o painel de custos tem na linha 161

Como observar: Abrir `/configuracao-ia` como administrador: `GET /configuracao-ia`, `/configuracao-ia/versoes`, `/ia/estado`, `/ia/modelos`, `/prompt` e `/prompt/CONVERSA/versoes`.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 (6 requisições ao abrir) e código lido pelo agente principal.

## Entregáveis

1. O conteúdo do painel de Prompts montado só com a aba ativa (`@if` ou `@defer`), preservando o rascunho em edição ao trocar de aba (a rota tem `canDeactivate` para o rascunho: conferir que continua valendo).
2. Teste de componente: abrir a página não chama `GET /prompt`.

## Critérios de Aceite

- Ao vivo: abrir `/configuracao-ia` faz 4 requisições; abrir a aba Prompts faz as outras 2.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

