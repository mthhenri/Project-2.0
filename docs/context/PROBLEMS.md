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

### P-023 — Desfazer da entrada numa demanda sem outros membros é recusado · `ABERTO` · chat IA/demanda

- **Sintoma:** o desenvolvedor entra numa demanda **sem nenhum membro** pelo chat (cartão "Atribuir membro", Confirmar) e, ao clicar em **Desfazer**, a API responde
  `400 Não é possível remover o último membro da demanda`. A mesma regra faz a IA recusar "sai da demanda X" quando ele é o único membro.
- **Causa:** o desfazer de `ATRIBUIR_MEMBRO` remove a linha de `demanda_usuario` pela mesma regra de remoção da tela, que nunca deixa a demanda sem membro.
- **Contorno:** deixar a pessoa na demanda, ou o gestor colocar outro membro antes de ela sair.
- **Correção:** decidir se o desfazer de uma entrada que acabou de acontecer deve valer mesmo com a regra (por exemplo, o executor desfaz direto a linha que ele mesmo criou) ou se a recusa é o comportamento esperado (então este item vira `ACEITO`).
- **Desde:** 2026-10-19 (observado na verificação ao vivo da task 170, `VERIFICACAO-170-FECHAMENTO.md`).

### P-024 — Mover trecho do pad sobrescreve o que o usuário digita durante a chamada · `ABERTO` · pad/frontend

- **Sintoma:** durante `POST /anotacao/:id/mover`, o que o usuário digita na seção de origem ou de destino é sobrescrito quando a resposta chega (`aplicarMovimento` → `adotar()` regrava o controle sem emitir evento).
- **Causa:** a task 201 tirou o overlay global dessa chamada (e do autosave do pad); antes o overlay bloqueava a digitação depois de 250 ms.
- **Contorno:** esperar a resposta (rápida) antes de digitar nas duas seções.
- **Correção:** desabilitar as duas seções (ou só as duas envolvidas) enquanto o movimento está em andamento.
- **Desde:** 2026-10-20 (achado da revisão independente da task 201).

### P-025 — Conversas dos desenvolvedores: o período e a busca olham só uma janela do histórico · `ABERTO` · chat IA/gestor

- **Sintoma:** com mais de 100 dias de chat, `listar_conversas_do_desenvolvedor` com `inicio`/`fim` antigos devolve lista vazia e `haMais: false`; `buscar_nas_conversas_do_desenvolvedor` pede 50 achados ao armazenamento antes de filtrar o contexto `CHAT`, então mensagens de check-in ocupam vagas.
- **Causa:** o filtro de período e de contexto é aplicado em memória, depois de o armazenamento já ter cortado em `LIMITE_CONVERSAS` (100) e `LIMITE_BUSCA` (50).
- **Contorno:** o gestor pede períodos recentes ou busca por texto mais específico.
- **Correção:** passar o intervalo e o contexto à consulta do armazenamento (`ArmazenamentoDeChat`, nos três repositórios) ou, no mínimo, sinalizar o truncamento.
- **Desde:** 2026-10-20 (task 201).

### P-026 — Tabela de Atividades do gestor passa da largura do conteúdo em 1366×768 · `ABERTO` · atividade/frontend

- **Sintoma:** com as colunas de seleção e Usuário (gestor), a tabela mede 1081 px num conteúdo de 1030 px e a coluna Ações fica cortada.
- **Causa:** não investigada a fundo (soma das larguras das colunas com os selos de prioridade e status).
- **Contorno:** rolar a tabela na horizontal ou recolher a barra lateral.
- **Correção:** rever as larguras das colunas ou deixar a tabela rolar dentro do cartão com a coluna Ações fixa.
- **Desde:** 2026-10-20 (visto na verificação da task 201; anterior a ela).

### P-027 — Quebra visual do cronômetro correndo em Ponto/Execuções não reproduzida · `ABERTO` · ponto/execucao/frontend

- **Sintoma:** o autor relatou que as telas de Ponto e Execuções "quebram visualmente" com o horário rodando.
- **Causa:** não reproduzida. A task 201 corrigiu um desalinhamento real (atividade em colunas diferentes no card de Ponto da equipe) e mediu 9 s de cronômetro sem tremor de largura em Chromium/Linux; o defeito do autor pode ser outro (fonte monoespaçada diferente no Windows, outro estado da tela).
- **Contorno:** nenhum conhecido.
- **Correção:** precisa de uma captura da tela quebrada e do ambiente (sistema, navegador ou Project Desktop, largura da janela).
- **Desde:** 2026-10-20.

### P-028 — Custo da IA: consulta sem índice e DTO no backend · `ACEITO` · ia-custo

- **Sintoma:** `somarUso` usa `DATE(uso_data) BETWEEN`, que não aproveita o índice `ix_ia_uso_uso_data`; `IaUsoSomarDto` está em `backend/`, contra a regra de DTO só em `shared/`.
- **Causa:** o critério de dia segue o do relatório de execuções (fuso da sessão), e o DTO é interno do repository.
- **Contorno:** a tabela é pequena (uma linha por chamada de IA); a consulta é só do administrador.
- **Correção:** consultar por intervalo (`uso_data >= :inicio AND uso_data < :fim + 1`) e mover o DTO para `shared/src/dtos/ia-custo/` quando a tabela crescer.
- **Desde:** 2026-10-20 (task 201).

### P-001 — Projeto sem lint · `CONTORNADO` · repositório

- **Sintoma:** não há ESLint nem Prettier em nenhum workspace; o gate de qualidade do `CLAUDE.md` pede lint e hoje a lacuna é só declarada no fecho de cada task.
  (A parte de **testes** deste item foi resolvida pelas tasks 171–187: ver `HISTORY.md`, bloco da 187, com a cobertura de partida e a final.)
- **Causa:** o projeto foi construído verificando por build, testes e execução manual; nunca se escolheu nem configurou um linter.
- **Contorno:** `npm test` na raiz, `npm run test:integracao`, build dos workspaces e verificação ao vivo (skill `verify`); revisão do diff pela skill `conventions-check`.
- **Correção:** escolher e configurar lint e acrescentar ao CI (`IDEAS.md` I-002).
- **Desde:** origem do projeto.
