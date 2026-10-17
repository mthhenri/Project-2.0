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

### P-001 — Cobertura de testes mínima, frontend sem testes e sem lint · `CONTORNADO` · repositório

- **Sintoma:** só existem testes para `shared/src/validators`, o `SqlMigrationSource` e as
  invariantes das migrations, e os helpers puros do `PontoService` (18 casos no total). Services,
  repositories e todo o frontend não têm teste. Não há ESLint nem Prettier em nenhum workspace.
- **Causa:** o projeto foi construído verificando por build e execução manual; os primeiros testes
  só entraram na adoção do kit (2026-10-16).
- **Contorno:** `npm test` na raiz; build dos workspaces; verificação ao vivo (skill `verify`).
  Código novo em regra pura ou helper de service leva teste no mesmo commit.
- **Correção:** (1) testar services com repositórios falsos, começando por permissão e regras de
  execução; (2) escolher e configurar lint e acrescentar ao CI; (3) decidir se o frontend terá
  testes (Angular/Karma ou Vitest) antes da migração de UI de `IDEAS.md` I-001.
- **Desde:** origem do projeto.


### P-004 — Dia de "hoje" da tela de Execuções vem do fuso do navegador · `ACEITO` · frontend

- **Sintoma:** com o navegador num fuso diferente de `APP_TIMEZONE` (America/Sao_Paulo), "hoje" no cabeçalho e o filtro
  `data` podem ficar um dia à frente/atrás do dia do servidor (observado ao rodar sem `TZ` no ambiente de teste: o app
  mostrou 17/10 enquanto as execuções estavam em 16/10).
- **Causa:** `hoje`, o limite "sem dias futuros" e o `data` enviado são calculados com `new Date()` local; o servidor
  filtra por `DATE(inicio_data)` no fuso configurado.
- **Contorno:** o time usa o fuso do servidor; nada a fazer no uso normal.
- **Correção:** se um dia houver usuário em outro fuso, o servidor passa a informar "hoje" (ou a tela usa o fuso da API).
- **Desde:** origem; mais visível desde a task 110 (subtítulo com o dia).

### P-005 — `subscribe` sem handler de erro deixa `HttpErrorResponse` não tratado no console · `ACEITO` · frontend

- **Sintoma:** quando uma chamada falha, o usuário vê o toast do interceptor, mas o console registra o erro como não
  tratado (Playwright reporta `pageerror HttpErrorResponse`). Acontece em várias telas (ex.: `buscarExecucoes`).
- **Causa:** `subscribe({ next })` sem `error`; o interceptor já comunica o motivo ao usuário.
- **Contorno:** nenhum efeito visível ao usuário. As chamadas de CSV e IA do relatório (111) já têm `error`.
- **Correção:** varrer os `subscribe` das telas e acrescentar `error: () => undefined` (ou migrar para um helper).
- **Desde:** origem; achado durante a verificação da task 111.
