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

### P-001 — Sem testes automatizados nem lint · `ABERTO` · repositório

- **Sintoma:** os `package.json` de `backend/` e `frontend/` não têm script de teste nem de lint, e
  `shared/` não tem script nenhum; não há arquivos `*.spec.ts` de código nem configuração de ESLint
  ou Prettier. O CI instalado só roda a verificação de organização do repositório.
- **Causa:** o projeto foi construído verificando por build e execução manual.
- **Contorno:** `npm run build --workspace=backend` e `--workspace=frontend` mais verificação
  manual da aplicação (skill `verify`); declarar no fecho de cada task que a cobertura é manual.
- **Correção:** decidir ferramenta de teste (backend/shared) e de lint, e acrescentar os passos ao
  `ci.yml` (há um bloco `<adoção>` comentado esperando por eles).
- **Desde:** origem do projeto (constatado na adoção do kit, 2026-10-16).
