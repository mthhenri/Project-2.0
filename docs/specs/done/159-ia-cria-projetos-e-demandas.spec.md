# Task 159 — A IA cria projetos e demandas (paridade com o usuário)

> Origem: pedido do autor ao ver a IA dizer que não criava demandas nem projetos. Princípio: **tudo o que o usuário faz no sistema a IA também faz, com confirmação, e nunca exclui.** Absorve a task 154 (criar demanda).

## Objetivo

Fazer a IA propor a criação de projetos e de demandas (de estrutura, de trabalho, de topo ou filhas), com as mesmas regras e permissões da tela.

## Entregáveis

1. Migration `0037` com o tipo de proposta `CRIAR_PROJETO` (`CRIAR_DEMANDA` já existia desde a `0035`).
2. Ferramentas de leitura `listar_projetos` e `listar_demandas_do_projeto` e de proposta `propor_criar_projeto` (gestor) e `propor_criar_demanda` (qualquer usuário; as regras da `DemandaService` valem: o desenvolvedor só cria sub-demanda).
3. Encadeamento: `projetoPropostaId` e `demandaPaiPropostaId` referenciam uma proposta anterior, resolvida na confirmação pelo resultado dela (confirmar fora de ordem é recusado com orientação).
4. Executores `CRIAR_PROJETO` e `CRIAR_DEMANDA` pelas services, com desfazer seguro (projeto sem demandas; demanda sem sub-demandas nem atividades).
5. Cartão do chat com resumo e "Ajustar" dos dois tipos.

## Critérios de Aceite

- Na aplicação real, "crie o projeto X, nele a demanda de estrutura Cadastro e a filha Novo cadastro" gera três cartões encadeados; confirmar em ordem cria tudo; desfazer fora de ordem é recusado.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Descrições da demanda (155), conexões (156) e leitura da equipe (153).
