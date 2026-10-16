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

### P-002 — Barra de navegação do topo não é responsiva e causa scroll horizontal em 360 px · `ABERTO` · frontend

- **Sintoma:** em 360×800 todas as telas têm `scrollWidth` ≈ 1388 px contra `clientWidth` 360: o
  menu horizontal do topo (Ponto, Calendário, … Usuários, relógio, Minhas Anotações) não quebra
  nem recolhe. Medido em `/tag`, `/projeto`, `/usuario` e `/atividade/nova`.
- **Causa:** não investigada além de a largura vir da topbar (`frontend/src/app/shared/layout/topbar`).
- **Contorno:** nenhum no celular; em desktop não aparece.
- **Correção:** tratada pela spec 96 (`topbar-reorganizacao-e-atalhos`) da revisão de UX, se cobrir
  o viewport mobile; confirmar ao implementá-la.
- **Desde:** anterior à adoção do kit (constatado em 2026-10-16, task 117).
