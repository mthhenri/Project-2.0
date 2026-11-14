# 350-documentacoes-marcas-acompanham-o-texto-gravado.spec.md

> Task 22/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-029 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/documentacao.

## Objetivo

Depois de Gravar, o ícone da aba e as marcas do seletor (`temDescricaoTecnica`, `temDescricaoCliente`, `temDocumentacao`) refletem o que foi gravado, sem requisição nova.

## Contexto

**A-029 · Baixa · Documentações: depois de Gravar, o ícone da aba e as marcas do seletor não acompanham o texto gravado**

`salvar()` só atualiza `versao` em `demanda()`; `preenchidaDaAba` lê os textos antigos de `demanda()`. A lista `demandas()` da página só muda em `carregar()`, então as marcas Técnica, Cliente e Documentação do seletor ficam como estavam na abertura da tela.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:121-123 — `preenchidaDaAba` lê `this.demanda()?.[campo]`
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:327 — depois do PATCH só `versao` entra em `demanda`
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:38 e 63-64 — `demandas` só é definido em `carregar()`
- frontend/src/app/modules/documentacao/components/documentacao-seletor/documentacao-seletor.component.html:147-172 — as marcas vêm de `temDescricaoTecnica`, `temDescricaoCliente` e `temDocumentacao` da lista

Como observar: Numa demanda com a aba Documentação vazia, escrever e Gravar: o ícone da aba continua cinza e, no seletor, a marca "Documentação" da demanda continua vazia até recarregar a página.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `salvar()` aplica em `demanda` os textos enviados e emite um evento para a página atualizar os três `tem*` do item em `demandas()`.
2. Teste de componente: gravar um texto vazio apaga a marca; gravar texto acende.

## Critérios de Aceite

- Ao vivo: escrever a documentação de uma demanda sem documentação acende a marca no seletor sem recarregar.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

