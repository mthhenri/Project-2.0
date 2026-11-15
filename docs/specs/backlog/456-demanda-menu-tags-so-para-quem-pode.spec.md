# 456-demanda-menu-tags-so-para-quem-pode.spec.md

> Task 128/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-171 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/demanda.

## Objetivo

O desenvolvedor que não é membro da demanda deixa de ver "Tags" no menu de contexto da árvore e do Controle de horas, que hoje abre o diálogo e termina em 403.

## Contexto

**A-171 · Baixa · Item 'Tags' do menu de contexto da demanda aparece ao desenvolvedor em demanda da qual não é membro; o backend recusa**

O menu de contexto da árvore e do Controle de horas inclui 'Tags' sem condição, e o próprio comentário diz que quem recusa é o backend. A service só deixa o desenvolvedor atribuir tag em demanda da qual é membro, e ele vê qualquer demanda de projeto acessível. O alvo do menu não carrega a informação de membresia, então o item não tem como ser escondido hoje.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/utils/demanda-context-menu.factory.ts:40-41 — comentário: 'Tags fica para todos (o desenvolvedor só grava nas demandas de que é membro: quem recusa é o backend)'
- frontend/src/app/modules/demanda/utils/demanda-context-menu.factory.ts:75-82 — item 'Tags' adicionado sem condição
- frontend/src/app/modules/demanda/utils/demanda-context-menu.factory.ts:6-12 — DemandaMenuAlvo não tem campo de membresia
- backend/src/modules/demanda/services/demanda.service.ts:777-780 — 403 'Você só pode atribuir tags em demandas das quais é membro'
- docs/SYSTEM.SPEC.md:1412 — desenvolvedor vê qualquer demanda de projeto acessível, não só as que é membro

Como observar: Como desenvolvedor, em /demanda, botão direito numa demanda do projeto em que não é membro, 'Tags', alterar e salvar: PUT /demanda/:id/tag responde 403. Não li o diálogo de tags para ver se ele bloqueia antes.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. O alvo do menu leva `podeEditar` da demanda e o item é escondido quando o usuário não tem visão total nem é membro; teste da fábrica do menu.

## Critérios de Aceite

- Como desenvolvedor não membro, o menu de contexto da demanda não mostra "Tags".
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

