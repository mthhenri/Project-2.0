# Task 145 — Chat: propostas de atividade e de execução

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Fluxo do desenvolvedor, itens 3, 5 e 9; princípio "Nada é gravado sem confirmação".

## Objetivo

Fazer a IA **propor** criar atividade, iniciar e pausar execução (inclusive a pausa do almoço), com executor, desfazer e cartão com resumo e ajuste, sempre pelas services de hoje.

## Entregáveis

1. Executores registrados em `ExecutorPropostaIaRegistro` para `CRIAR_ATIVIDADE`, `INICIAR_EXECUCAO` e `PAUSAR_EXECUCAO`: `validar` (dados da proposta), `executar` chamando `AtividadeService`/`ExecucaoService` com o `JwtPayload` do usuário (valem permissão por dono e a regra de uma execução ativa; **iniciar pausa antes a execução ativa**), `desfazer` com a ação inversa quando ainda for segura (senão `BusinessException` clara).
2. Ferramentas de proposta (`FerramentaPropostaIa`): `propor_criar_atividade` (demanda, nome, prioridade; várias atividades de uma frase viram várias propostas), `propor_iniciar_execucao` (atividade e descrição provisória) e `propor_pausar_execucao` (com `descricao` opcional: é como "vou almoçar" pausa descrevendo o trabalho feito; o almoço em si nunca vira descrição).
3. Cartão de proposta (frontend, `app-chat-proposta-cartao`): resumo legível por tipo (no lugar dos pares chave/valor), "Ajustar" com formulário simples por tipo (nome, prioridade, demanda; descrição) que confirma como `AJUSTADA`, e Desfazer com o toast padrão do projeto.
4. Prompt `CONVERSA`: instruções de quando propor, de pedir só o que falta e de nunca afirmar que fez algo antes da confirmação.
5. Testes: executores (regra de uma execução ativa, pausa automática, desfazer inseguro), ferramentas só criam proposta, nenhuma chama service de domínio.

## Critérios de Aceite

- Ponta a ponta na aplicação real: "na demanda X tenho que fazer Y e Z" gera duas propostas; confirmar cria as atividades; "bora fazer Y" propõe iniciar e, ao confirmar, a execução anterior é pausada e a nova inicia.
- Confirmar duas vezes rápido executa uma vez só; desfazer reverte; ajustar muda os dados antes de executar.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Descrição formal da execução (150), bom dia (147) e reunião (148).
- Qualquer ferramenta de exclusão.

## Dependências

`136` (propostas), `137` (ferramentas), `138`/`139` (chat), `142` (prioridade) e `144` (leitura).

## Riscos e Mitigação

- A regra de uma execução ativa é do backend: o executor nunca a reimplementa, só chama a service e traduz o erro.
