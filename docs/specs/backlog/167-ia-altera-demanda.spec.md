# Task 167 — IA: propor alterar demanda (nome, status, horas e previsão)

> Origem: mapa de lacunas entre o que as telas fazem e o que a IA faz (2026-10-18), no espírito do princípio da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md): a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

A IA já cria e descreve demandas, mas não conclui, replaneja nem reestima. Passa a **propor** a alteração de demanda (gestor), pela `PUT demanda/:id` de hoje.

## Entregáveis

1. Padrão de toda proposta nova: migration inserindo o código em `tipo_proposta_ia` (modelo da `0037`), enum em `shared/`, DTO de dados, executor em `ExecutorPropostaIaRegistro` (`validar`, `executar` pela service com o `JwtPayload` do usuário, `desfazer`, `estaObsoleta`), ferramenta `FerramentaPropostaIa` que só cria a proposta, cartão no `app-chat-proposta-cartao` e instrução no prompt `CONVERSA`.
2. Tipo `ALTERAR_DEMANDA` (permissão GESTOR): dados `demandaId` e ao menos um entre `nome`, `status`, `horasEstimadas` e `previsaoFimData`; cartão com antes e depois.
3. Executor via `DemandaService.alterar` (regras de hoje: status válidos, demanda estrutural, hierarquia); `desfazer` devolve os valores anteriores.
4. `propor_alterar_demanda`, apoiada em `listar_demandas_do_projeto` e `consultar_demanda` para achar a demanda certa; "concluir a demanda" com atividades em aberto mostra o aviso no cartão (a regra de hoje decide se bloqueia).
5. Testes: executor (alterar, desfazer, permissão) e ferramenta só cria proposta.

## Critérios de Aceite

- "Conclui a demanda X" e "muda a previsão da Y para 30/11" geram cartão com antes e depois; confirmar aplica e desfazer reverte.
- Desenvolvedor não vê a ferramenta (permissão GESTOR) e a service recusa se chamada.
- Mover de pai (`demandaPaiId`) não entra: segue pela task 156 (lugar na árvore).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartão novo verificado ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, tendo como análogo o cartão de `INICIAR_EXECUCAO` (estados vazio, carregando, cheio e erro).

## Fora de Escopo

- Excluir demanda.
- Alterar descrições (já existe `DESCREVER_DEMANDA`) e conexões (já existe `CONECTAR_DEMANDA`).

## Dependências

`153`, `155` e `156` (gestor) e `159` (criação de demandas).

## Riscos e Mitigação

- Concluir demanda com atividades abertas: seguir a regra da service e mostrar o aviso, sem decidir pelo gestor.
