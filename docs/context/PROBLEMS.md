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

### P-020 — O chip "execução atual" da topbar não atualiza sozinho depois de iniciar uma atividade pelo chat · `ABERTO` · frontend

- **Sintoma:** ao confirmar no chat uma proposta que inicia uma atividade, a execução começa, mas o chip da topbar continua como antes até a página ser recarregada ou a aba refocada (relato do autor; não reproduzido nesta sessão).
- **Causa:** não investigada. Suspeita: o chip se atualiza pelo `execucaoAtivaInterceptor` (chamadas HTTP de execução da tela) e pelo `ressincronizarExecucao` (foco da aba), e a confirmação da proposta passa por outro endpoint que o interceptor não reconhece.
- **Contorno:** focar outra aba e voltar, ou recarregar.
- **Correção:** a confirmação de proposta (e o desfazer) que inicia/pausa/encerra execução deve disparar `execucaoAtiva.carregar()`.
- **Desde:** tasks do chat com propostas (135–141); anotado em 2026-10-19.

### P-021 — "Reload estranho" do check-in ao enviar · `ABERTO` · frontend

- **Sintoma:** ao enviar uma resposta no check-in, a página parece recarregar (relato do autor).
- **Causa:** provável: era o submit nativo do `<form>` sem `ngSubmit` (P-018), corrigido em 2026-10-19 com `(submit)="$event.preventDefault(); enviar()"`. Falta confirmar ao vivo; se o reload persistir, a causa é outra (por exemplo, a navegação ou o `window.focus` recarregando a situação do check-in).
- **Contorno:** enviar com Enter.
- **Correção:** verificar ao vivo (check-in, botão e Enter, nos três tamanhos); remover o item se o reload não ocorrer mais.
- **Desde:** origem da tela do check-in; anotado em 2026-10-19.

### P-022 — A IA "se perde" depois de criar algo: não confere se a criação foi feita · `ABERTO` · backend/chat IA

- **Sintoma:** depois que uma proposta é confirmada (ou é só proposta ainda), a IA fala como se o estado fosse o de antes: não rechecou se a criação aconteceu, repete a proposta ou afirma coisas desatualizadas (relato do autor; sem caso reproduzido).
- **Causa:** não investigada. Suspeita: o histórico enviado ao modelo não traz o resultado da confirmação (só o texto da conversa) e as ferramentas de leitura não são reconsultadas depois da confirmação.
- **Contorno:** pedir à IA que confira ("veja de novo").
- **Correção:** investigar com uma conversa real; candidatas: registrar a confirmação como evento no contexto, e/ou instruir o prompt a reler o estado depois de uma proposta confirmada.
- **Desde:** blocos 5–6 do chat (propostas e ferramentas); anotado em 2026-10-19.
