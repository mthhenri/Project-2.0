# Task 154 — Chat do gestor: criar demanda conversando

> **2026-10-18 — Absorvida pela task 159** ([`159-ia-cria-projetos-e-demandas`](159-ia-cria-projetos-e-demandas.spec.md)): a criação de demanda (e de projeto) pela IA saiu lá, com permissão de qualquer usuário (as regras da `DemandaService` valem) em vez de só gestor. O corpo abaixo não foi reescrito.

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 9. Fluxo do gestor, item "Criar demanda conversando".

## Objetivo

Fazer a IA propor a criação de demandas ("no projeto X, criar uma demanda sobre…") com executor, desfazer e cartão.

## Entregáveis

1. Executor `CRIAR_DEMANDA` chamando o `DemandaService` com o usuário do token (mesmas validações: projeto existente, nome, hierarquia), com `desfazer` por soft delete **somente** se a demanda ainda não ganhou atividades ou conexões (senão recusa clara).
2. Ferramenta de proposta `propor_criar_demanda` (projeto, nome, demanda pai opcional), permissão `GESTOR`.
3. Cartão com resumo (projeto, nome, onde fica na árvore) e ajuste simples.
4. Testes: executor, desfazer seguro e inseguro, desenvolvedor sem a ferramenta.

## Critérios de Aceite

- Na aplicação real, "no projeto X, criar uma demanda sobre login" propõe a demanda; confirmar cria; desfazer a remove se estiver vazia.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Descrições da demanda (155) e conexões (156).

## Dependências

`153`, `136`/`137` e `139`.
