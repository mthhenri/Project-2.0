# Task 178 — Testes: execuções

> Task 8/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). **Prioridade 1** entre os domínios: é a regra mais
> violada do projeto e `execucao.service` (433 linhas) não tem teste direto.

## Objetivo

Provar as regras de execução de `SYSTEM.SPEC.md` §12–§14: uma execução ativa por usuário (pelo **dono da atividade**),
quem inicia e pausa, registro manual pelo gestor, edição, sobreposição e o auto-stop da virada do dia.

## Entregáveis

### Backend

1. **`execucao.service`:**
   - nunca duas ativas (sem `fim_data`) para o mesmo usuário; a trava olha `atividade.usuario_id`, porque a execução não
     tem coluna de usuário;
   - gestor inicia/pausa execução de **qualquer** atividade; desenvolvedor só das próprias; a autorização **não** passa
     por `demanda_usuario`;
   - `encerrar` exige `fim_data` e descrição quando obrigatória (`descricaoObrigatoria`);
   - `registrar` (`@GestorOnly`): início antes do fim, mesmo dia, sem sobreposição com execução do dono, data futura
     recusada (conferir o documento);
   - `alterar` (descrição, início, fim) com as mesmas validações e por quem pode editar execuções de outros (§14);
   - `excluir` soft; `listar`/`recuperar` — desenvolvedor só vê as próprias;
   - `encerrarExecucoesAbertas` encerra todas as abertas às 23:59:59 do fuso `APP_TIMEZONE` e o job é registrado com
     esse fuso (testar a função e o registro, sem esperar o cron).
2. **`execucao.repository` (integração, 482 linhas):** detecção de ativa por dono; sobreposição (encostadas não
   sobrepõem, contidas e cruzadas sim, ativa conta com `COALESCE(fim_data, NOW())`); `timestamptz` e virada de dia no
   fuso; histórico por atividade; listagem da equipe do dia; excluída fora. **Datas explícitas** — `NOW()` está congelado
   na transação de teste.
3. **Regra pura:** `execucao-ativa-detalhada`; conferir `equipe-do-dia`, `mudancas-da-queda`, `periodo-da-execucao`,
   `redacao-da-descricao`.
4. **Controller:** permissão de cada rota (`/execucao/registro` só gestor).
5. **IA:** executores `corrigir-execucao`, `iniciar-execucao` (pausa a anterior e reabre se falhar), `pausar-execucao`,
   `registrar-execucao`; ferramentas `consultar-execucao-ativa`, `consultar-mudancas-da-queda`,
   `listar-atividades-paradas`, `listar-execucoes-da-equipe`, `listar-minhas-execucoes-do-dia`, `propor-*` — conferir
   antes o que os testes agregados (`executores-de-execucao`, `ferramentas-de-execucao`, `ferramentas-de-proposta`,
   `registrar-e-corrigir-execucao`, `agir-por-outro-usuario`) já cobrem e completar só a lacuna.

### Frontend

6. **Lógica:** `execucao.util`, `modules/execucao/services/execucao.service`, `core/services/execucao-ativa.service`,
   `core/interceptors/execucao-ativa.interceptor`.
7. **Componentes:** `execucao-historico` (filtros, vazio/cheio/erro, edição só para quem pode), `execucao-timer`
   (tempo a partir do início, parada ao encerrar); `chip-execucao-ativa` fica na 187.

## Critérios de Aceite

- Os bullets de execução de §14 e as duas "regras mais violadas" de `CLAUDE.md` sobre execução têm teste em service **e**
  repository, listados no fecho.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Ponto e intervalos (179), mesmo que derivem de execuções. Mudar regra de execução.

## Dependências

171, 172, 173, 177 (fábricas de atividade). Fontes: `SYSTEM.SPEC.md` §12 (`execucao`), §13 (Execucao), §14; memória de
`timestamptz`.
