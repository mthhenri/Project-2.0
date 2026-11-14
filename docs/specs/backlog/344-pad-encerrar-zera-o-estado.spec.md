# 344-pad-encerrar-zera-o-estado.spec.md

> Task 16/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-019, A-020 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/pad.

## Objetivo

Depois que um lugar que mostrava o pad é destruído (sair da tela Usuários, sair da sessão), o `PadService` fica pronto para o próximo uso: volta a gravar sozinho em Documentações e na aba Anotações do chat, e não guarda o texto de quem saiu.

## Contexto

**A-019 · Média · Pad: depois de sair da tela Usuários (ou de sair e entrar de novo na mesma aba), o pad de Documentações e da aba Anotações do chat para de gravar sozinho**

`UsuarioAnotacoesDialogComponent` chama `pad.encerrar()` ao ser destruído. Há duas instâncias (topbar e tela Usuários); a da tela é destruída a cada saída de `/usuario`. `encerrar()` cancela a assinatura `valueChanges` de cada seção, mas deixa `secoes()` e `usuarioId()` como estavam. `garantirCarregado()` não relê quando é o mesmo usuário com seções em memória. O painel passa a mostrar seções sem assinatura: digitar não agenda o PUT, o estado não vira "Editando…" e o botão Salvar fica desabilitado. Só Ctrl+S, abrir e fechar a gaveta ou sair do painel do chat gravam.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts:47-51 — o onDestroy do diálogo chama `this.pad.encerrar()`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:307 e frontend/src/app/shared/layout/topbar/topbar.component.html:221 — duas instâncias do diálogo, uma por tela Usuários e outra na casca
- frontend/src/app/modules/usuario/services/pad.service.ts:152-156 — `encerrar()` chama `secao.encerrar()` e não limpa `secoes` nem `usuarioId`
- frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/secao-anotacao.ts:65-69 — `encerrar()` da seção cancela a assinatura
- frontend/src/app/modules/usuario/services/pad.service.ts:460 — a gravação automática só existe por essa assinatura (`valueChanges` → `aoDigitar`)
- frontend/src/app/modules/usuario/services/pad.service.ts:107-108 — `garantirCarregado` retorna sem reler se é o mesmo usuário e `secoes().length > 0`
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.ts:52-55 e frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:105-108 — os dois lugares que usam `garantirCarregado`
- frontend/src/app/modules/usuario/components/pad-painel/pad-painel.component.html:136-139 — Salvar só habilita em 'editando' ou 'erro'

Como observar: Como gestor: teclar `n` (abre o próprio pad) e fechar; entrar em Usuários; ir para Documentações. Digitar no pad ao lado e esperar 3 s: não sai `PUT /anotacao/...` na aba de rede, o rodapé não mostra "Editando…" e "Salvar" fica cinza. F5 perde o texto.

Verificação na auditoria: código lido pelo agente principal (`usuario-anotacoes-dialog.component.ts:47` chama `pad.encerrar()` ao destruir; `pad.service.ts:152` para o relógio e encerra as seções sem zerar `secoes` nem `usuarioId`). O efeito na tela não foi reproduzido: um teste de 12 s em Documentações não gravou nem no caminho direto nem depois de passar por Usuários, então a gravação automática tem prazo maior que o do teste.

**A-020 · Média · Pad: o texto das seções fica em memória depois de sair; se a carga do pad do próximo usuário falhar, o painel mostra o pad do anterior**

`logout()` navega para `/autenticacao` sem recarregar a página e ninguém limpa `PadService` (`providedIn: 'root'`). No login seguinte na mesma aba, `garantirCarregado(B)` troca `usuarioId` e chama `carregar(B)`; se o `GET /anotacao` falhar, o `error` não limpa `secoes` e `app-pad-painel` renderiza as seções do usuário anterior sob o título "Minhas anotações".

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/autenticacao.service.ts:34-39 — `logout()` só limpa token, sessão e execução ativa e navega
- frontend/src/app/modules/usuario/services/pad.service.ts:34 e 43 — serviço raiz com `secoes` em sinal
- frontend/src/app/modules/usuario/services/pad.service.ts:107-112 — `garantirCarregado` troca o usuário e carrega, sem limpar `secoes`
- frontend/src/app/modules/usuario/services/pad.service.ts:469-472 — o `error` de `carregar()` não limpa `secoes`
- frontend/src/app/modules/usuario/components/pad-painel/pad-painel.component.html:30-43 — fora do carregando, renderiza `pad.secoes()`
- frontend/src/app/modules/usuario/services/pad.service.ts:57 — o título depende só de `usuarioId`

Como observar: Entrar como A, abrir o pad e sair; entrar como B na mesma aba; bloquear `*/anotacao*` no DevTools e abrir Documentações: o pad ao lado mostra o texto de A.

Verificação na auditoria: código lido pelo agente principal (`usuario-anotacoes-dialog.component.ts:47` chama `pad.encerrar()` ao destruir; `pad.service.ts:152` para o relógio e encerra as seções sem zerar `secoes` nem `usuarioId`). O efeito na tela não foi reproduzido: um teste de 12 s em Documentações não gravou nem no caminho direto nem depois de passar por Usuários, então a gravação automática tem prazo maior que o do teste.

## Entregáveis

1. Primeiro, o teste que reproduz: `encerrar()` seguido de `garantirCarregado()` do mesmo usuário e de uma digitação precisa gravar; hoje as seções ficam encerradas.
2. `PadService.encerrar()` dispara as gravações pendentes e zera `secoes` e `usuarioId`, para o próximo `abrir`/`garantirCarregado` reler.
3. No erro de `carregar()` com usuário diferente do que está em memória, `secoes` é limpo (o painel não mostra o pad do anterior).

## Critérios de Aceite

- Teste do serviço passa nos dois casos (regravar depois de encerrar; falha de carga não mostra o pad anterior).
- Ao vivo: abrir Usuários, ir a Documentações, digitar no pad e esperar o prazo da gravação automática: sai `PUT /anotacao/:usuarioId/:tipo`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar o prazo ou o desenho da gravação automática.

## Dependências

Nenhuma.

