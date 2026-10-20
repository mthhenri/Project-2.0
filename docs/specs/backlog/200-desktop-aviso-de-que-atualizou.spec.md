# 200-desktop-aviso-de-que-atualizou.spec.md

> Task solta, só a spec (para fazer depois). Origem: pedido do autor em 2026-10-20, ao trocar o Project Desktop da 1.0.0 para a 1.0.1 e não ter como saber, pelo app, que a
> versão nova estava rodando. Complementa a [`198`](../done/198-desktop-baixar-e-atualizar.spec.md), que avisa quando há versão **nova para baixar** mas não quando o app **acabou de ser atualizado**.

## Objetivo

Quando o usuário abrir o Project Desktop e ele estiver numa versão diferente da que rodou da última vez, o app **mostra e avisa que atualizou**, dizendo para qual versão.

## Situação encontrada

- O app lê `GET /desktop/versao` de hora em hora e, se o servidor publicou uma versão maior, mostra "Nova versão disponível" no menu da bandeja (task 198). Não há atualização silenciosa.
- Depois de o usuário baixar e abrir o executável novo, nada na tela diz que a versão mudou: a janela é a mesma e o menu da bandeja só some o item de atualização. Quem abriu o `.exe` antigo por engano
  (o que já aconteceu, ver `HISTORY.md` de 2026-10-20) também não percebe.
- A versão em uso vem do `package.json` (`app.getVersion()`); `politica-da-versao.ts` já compara versões e tem testes.

## Decisões em aberto (a confirmar com o autor antes de implementar)

1. **Onde avisar:** notificação do Windows (balão), aviso dentro da janela do Project (faixa ou toast) ou os dois. Proposta: uma notificação nativa do Windows e, em seguida, a versão no menu da bandeja
   ("Project Desktop 1.0.1").
2. **O que dizer:** só o número ("Atualizado para a versão 1.0.1") ou também o que mudou. Proposta: só o número agora; "o que mudou" exigiria uma fonte de notas de versão que hoje não existe.
3. **Quando contar como atualizado:** a versão que roda é **maior** que a registrada na última execução. Primeira execução da vida do app não avisa (não há "última").
4. **Atualizar sem baixar:** o executável portátil não se atualiza sozinho; esta task só avisa, não troca o arquivo.

## Entregáveis (propostos)

1. O app guarda, numa pasta própria dele (`app.getPath('userData')`), a **última versão que rodou**; ao abrir, compara com `app.getVersion()`.
2. Função pura em `politica-da-versao.ts` — `deveAvisarQueAtualizou(ultimaVersao, versaoAtual)` (só se a atual for maior; versão ausente, igual ou menor não avisa) — com testes, reaproveitando `compararVersoes` do `shared`.
3. Ao detectar a atualização: notificação do Windows e a linha de versão no menu da bandeja; depois do aviso, o app grava a versão atual como a última.
4. O aviso não depende de rede nem do login (é local), e não abre nem tira o Project da bandeja.
5. `desktop/README.md` (comportamento) e `HISTORY.md`.

## Critérios de Aceite

- Abrir o 1.0.1 depois de ter rodado o 1.0.0 mostra o aviso uma vez; abrir de novo o 1.0.1 não mostra.
- Abrir uma versão **menor** que a registrada (voltar ao executável antigo) não avisa como atualização, e não apaga a versão maior registrada (decisão a confirmar).
- Primeira execução, sem arquivo de versão, não avisa e grava a versão atual.
- Testes das funções puras e verificação de verdade no Windows com a versão atual e uma anterior simulada (pasta de dados própria, como na verificação do fechar/minimizar).

## Fora de Escopo

- Atualização automática ou silenciosa do executável, assinatura do executável, notas de versão detalhadas, Mac e Linux.

## Dependências

`198-desktop-baixar-e-atualizar` (em `done/`).

## Riscos e Mitigação

- **Aviso repetido:** gravar a versão só depois de mostrar o aviso, e uma vez por execução do app.
- **Pasta de dados diferente por forma de abrir** (portátil extrai para uma pasta temporária, mas `userData` é fixo por usuário do Windows): conferir na verificação que o registro sobrevive entre uma execução e outra.
