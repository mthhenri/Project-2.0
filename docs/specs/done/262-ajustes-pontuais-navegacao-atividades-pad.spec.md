# 262 — Ajustes pontuais de navegação, atividades e pad

> Origem: P-024, P-044, P-046, P-048 e P-056, e pedidos do autor em 2026-10-29.

## Objetivo

Corrigir os cinco problemas e ajustar a ordem e os menus do pad e de Minhas demandas.

## Entregáveis

1. Igualar o aviso do planejamento ao do chat, acrescentando o aviso de acesso ao plano.
2. Abrir a árvore em Projeto inteiro e relistar atividades após alteração de status.
3. Filtrar no Controle de horas apenas demandas planejadas e pendentes quando solicitado (confirmado pelo autor).
4. Proteger origem e destino durante movimentação no pad; ordenar Pessoal, Em aberto, Pendentes, Lembretes e Feito e mostrar ícones no menu de destinos.
5. Apresentar ícones e cores de status no menu contextual de Minhas demandas.

## Critérios de Aceite

Testes relevantes e build do frontend; verificar os fluxos na aplicação real em 1920×1080, 1366×768 e 1080×1920, comparando com telas existentes; registrar evidências e limites. Rodar npm run repo:verificar e revisar o diff conforme convenções.

## Fora de Escopo

Demais problemas registrados e mudanças de regras de negócio não solicitadas.

## Dependências

SYSTEM.SPEC.md, CONVENTIONS.md e convenções das telas existentes.

## Riscos e Mitigação

O pad é compartilhado: avaliar consumidores e evitar sobrescrever alterações em andamento. Não alterar regras de domínio ou indicadores compartilhados fora do escopo.
