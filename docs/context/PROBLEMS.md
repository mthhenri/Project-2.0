# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia (isso
> é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como desejado
> (isso é `CONTEXT.md`).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-001 — Cobertura de testes parcial e sem lint · `CONTORNADO` · repositório

- **Sintoma:** a cobertura é parcial: o frontend mede ~8% de statements (lógica pura e Tags; as
  demais telas não têm teste de componente), os repositories só ganharam teste de integração com a
  task 171 (Tags) e os services ainda não têm teste com repositório falso. Não há ESLint nem
  Prettier em nenhum workspace. Números de partida: `npm run test:cobertura`.
- **Causa:** o projeto foi construído verificando por build e execução manual; os primeiros testes
  só entraram na adoção do kit (2026-10-16).
- **Contorno:** `npm test` na raiz; build dos workspaces; verificação ao vivo (skill `verify`).
  Código novo em regra pura ou helper de service leva teste no mesmo commit.
- **Correção:** (1) as tasks 173–187 (guarda-chuva `testes-automatizados`) cobrem repositories,
  services e telas por domínio; (2) escolher e configurar lint e acrescentar ao CI.
- **Desde:** origem do projeto.

### P-004 — Outras telas ainda calculam "hoje" e as horas no fuso do navegador · `ACEITO` · frontend

- **Sintoma:** com o navegador num fuso diferente de `APP_TIMEZONE` (America/Sao_Paulo), Ponto, Calendário, Atividades e
  demais telas que usam `new Date()`/`DatePipe` podem mostrar "hoje" ou horas diferentes do servidor. Execuções e o
  relatório já seguem o fuso do sistema (2026-10-17).
- **Causa:** só essas duas telas usam `hojeNoFuso`/`horaNoFuso` (`shared/src/utils/fuso-horario.ts`) com
  `ambiente.fusoHorario`; as demais não foram migradas.
- **Contorno:** o time usa o fuso do servidor; nada a fazer no uso normal.
- **Correção:** migrar as demais telas para as mesmas funções (o `DatePipe` não aceita nome IANA de fuso).
- **Desde:** origem.

### P-010 — Mover uma demanda para dentro dela mesma ou de uma descendente cria ciclo na árvore · `ABERTO` · backend

- **Sintoma:** `PUT /demanda/:id` com `demandaPaiId` igual ao próprio id, ou ao id de uma descendente, é aceito: a
  demanda some da árvore (sem raiz) e o grafo do projeto passa a ter um ciclo de hierarquia.
- **Causa:** `DemandaService.alterar` só confere que o novo pai existe, é estrutural e é do mesmo projeto
  (`novo-pai-da-demanda`); não compara com a própria demanda nem com a subárvore dela. O repository já tem
  `listarDescendentes` (CTE recursiva) para isso. A CTE de ciclo vale só para `DemandaConexao`.
- **Contorno:** nenhum no sistema; a tela de edição lista os possíveis pais e não filtra a própria subárvore.
- **Correção:** na `alterar`, recusar com `BusinessException` quando o novo pai for a própria demanda ou estiver em
  `listarDescendentes`. Dois testes `todo: 'P-010'` em `demanda.service.regras.test.ts` viram normais.
- **Desde:** origem (achado na task 176).

### P-011 — Desenvolvedor membro não atribui tags, mas `SYSTEM.SPEC.md` §14 diz que pode · `ABERTO` · backend/documentação

- **Sintoma:** a service recusa o desenvolvedor em `alterarTagsDemanda` mesmo quando ele é membro da demanda; §14 ("Tags")
  diz que o desenvolvedor atribui tag apenas em demandas das quais é membro.
- **Causa:** divergência entre documento e código: a task 170 decidiu recusar o desenvolvedor sempre. O documento vence o código (CLAUDE.md), mas a decisão foi deliberada.
- **Contorno:** só o gestor atribui tags.
- **Correção:** o autor decide: (a) corrigir o código (membro atribui; teste `todo: 'P-011'` vira normal) ou (b) corrigir
  §14 para "somente o gestor atribui tags" e trocar o teste por um de recusa.
- **Desde:** task 170 (achado na task 176).

### P-012 — Criar demanda com tag inexistente grava a demanda e depois devolve 404 · `ABERTO` · backend

- **Sintoma:** `POST /demanda` com `tagIds` contendo uma tag que não existe responde 404, mas a demanda já ficou criada
  (e o cliente tenta de novo, duplicando).
- **Causa:** `DemandaService.criar` grava a demanda e só depois confere a existência de cada tag.
- **Contorno:** nenhum.
- **Correção:** validar as tags antes de gravar (ou gravar demanda e tags na mesma transação). O teste
  `todo: 'P-012'` vira normal.
- **Desde:** origem (achado na task 176).
