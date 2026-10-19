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

### P-001 — Projeto sem lint · `CONTORNADO` · repositório

- **Sintoma:** não há ESLint nem Prettier em nenhum workspace; o gate de qualidade do `CLAUDE.md` pede lint e hoje a lacuna é só declarada no fecho de cada task.
  (A parte de **testes** deste item foi resolvida pelas tasks 171–187: ver `HISTORY.md`, bloco da 187, com a cobertura de partida e a final.)
- **Causa:** o projeto foi construído verificando por build, testes e execução manual; nunca se escolheu nem configurou um linter.
- **Contorno:** `npm test` na raiz, `npm run test:integracao`, build dos workspaces e verificação ao vivo (skill `verify`); revisão do diff pela skill `conventions-check`.
- **Correção:** escolher e configurar lint e acrescentar ao CI (`IDEAS.md` I-002).
- **Desde:** origem do projeto.

### P-015 — Ponto diário cobra a meta cheia em fim de semana e dia não útil integral · `ABERTO` · backend

- **Sintoma:** `GET /ponto/diario` e `/ponto/todos` num sábado, domingo ou feriado integral devolvem `metaMinutos` igual à jornada (ex.: 480) e
  `saldoMinutos` negativo quando ninguém trabalhou. O mensal (`/ponto/mensal`) zera a meta desses mesmos dias, então o diário e o mensal discordam.
- **Causa:** `PontoService.montarPontoDiario` só trata a fração 0.5; no ramo "dias integrais" usa `metaMinutosCompleta` mesmo com `fracaoMeta = 0`.
  `SYSTEM.SPEC.md` §14 diz que fim de semana e dia não útil integral têm fração 0 e "não contam na meta".
- **Contorno:** a tela do card da equipe mostra o motivo no lugar do saldo em dia não útil, então o saldo errado quase não aparece; a IA
  (`consultar_ponto_do_dia`) devolve o `metaMinutos` e o `saldoMinutos` como vêm.
- **Correção:** meta 0 (descontada a justificativa, que então não deixa a meta negativa) quando `fracaoMeta === 0`; o saldo passa a ser só o
  trabalhado como extra, sem negativo. O `todo: 'P-015'` em `ponto.service.calculo.test.ts` vira teste normal. Confirmar com o autor se o saldo do
  dia não útil deve ser `0` ou o total trabalhado antes de corrigir.
- **Desde:** origem (achado na task 179).

