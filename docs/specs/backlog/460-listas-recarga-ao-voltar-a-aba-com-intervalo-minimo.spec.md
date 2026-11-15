# 460-listas-recarga-ao-voltar-a-aba-com-intervalo-minimo.spec.md

> Task 132/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-177, A-178, A-179, A-180 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-06.
> Severidade: Baixa. Área: frontend (usuario, ponto, atividade, execucao, configuracao-ia).

## Objetivo

A recarga automática ao voltar à aba passa por um utilitário comum com intervalo mínimo, em vez de cada tela recarregar sempre.

## Contexto

**A-177 · Baixa · Usuários: toda volta à aba refaz `GET /usuario`, sem intervalo mínimo**

O `HostListener` de `visibilitychange` chama `buscarUsuarios()` sempre que a aba fica visível, sem guarda de tempo e mesmo com diálogo aberto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:152-156 — `@HostListener('document:visibilitychange')` → `buscarUsuarios()`

Como observar: Na tela Usuários, trocar de aba e voltar várias vezes: uma `GET /usuario?pagina=…` por volta.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-178 · Baixa · Listas recarregam a cada foco da janela ou volta à aba, sem intervalo mínimo**

/atividade e /execucao releem a lista em todo `window:focus` e `visibilitychange` (cada Alt-Tab), com guarda só contra carga em andamento. /ponto relê em todo `visibilitychange` sem guarda nenhuma, e o detalhe da atividade relê atividade e execuções. Não há idade mínima do dado: voltar à janela dez vezes em um minuto são dez listagens.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:266-271 — dois `@HostListener`; `if (visibilityState !== 'visible' || this.carregando()) return; this.buscarAtividades()`
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:226-231 — mesmo padrão com `buscarExecucoes()`
- frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:155-158 — `if (document.visibilityState === 'visible') this.carregar()`, sem guarda
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:185-191 — `execucaoAtiva.carregar()` + `carregarExecucoes()` (2 requisições)
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:171-174 — 'aba oculta e visivel' inclui GET /ponto/todos

Como observar: Em /atividade ou /execucao, alternar para outro programa e voltar várias vezes: cada volta mostra GET /atividade?... (ou GET /execucao?...) além do GET /execucao/ativa. A medição só exercitou o foco em /ponto, onde apenas a topbar reage a `window:focus`.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-179 · Baixa · Custos da IA: cada foco da janela refaz a consulta, sem intervalo mínimo**

A aba Custos escuta window:focus e document:visibilitychange e chama carregar() toda vez; a única guarda é não haver carga em andamento. Alternar de janela várias vezes com a aba aberta repete GET do custo do período a cada volta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/configuracao-ia/components/custos-aba/custos-aba.component.ts:128-134 — @HostListener('document:visibilitychange') e @HostListener('window:focus') chamam this.carregar() se visível e não carregando
- frontend/src/app/modules/configuracao-ia/components/custos-aba/custos-aba.component.ts:142-143 — carregar() chama iaCustoService.consultar({ ano, mes })

Como observar: Em /configuracao-ia, aba Custos, dar Alt-Tab para outra janela e voltar três vezes. Na rede: uma consulta de custo (rota ia-custo) por volta.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-180 · Baixa · Seis telas recarregam a própria lista em toda volta à aba ou foco da janela, sem intervalo mínimo**

Varredura por `grep` de `visibilitychange` e `window:focus`: Usuários, Ponto, Atividades (listagem e detalhe), Execuções e a aba Custos das Configurações da IA têm cada uma o seu `@HostListener` que recarrega a lista quando a aba volta a ficar visível (três delas também no foco da janela). Nenhuma confere há quanto tempo a lista foi carregada. Medido: voltar à aba em `/ponto` refaz `GET /ponto/todos`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:153 — `@HostListener('document:visibilitychange')`
- frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:155 — idem
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:266 — `visibilitychange` e `window:focus`
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:185 — `visibilitychange`
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:226 — `visibilitychange` e `window:focus`
- frontend/src/app/modules/configuracao-ia/components/custos-aba/custos-aba.component.ts:129 — `visibilitychange` e `window:focus`

Verificação na auditoria: varredura por `grep` do agente principal em 2026-11-15 e medição ao vivo da volta à aba em `/ponto`.

## Entregáveis

1. Um utilitário em `core/` (função ou diretiva) que dispara a recarga só se a última carga tem mais que um prazo (constante nomeada, da ordem de 30 a 60 s) e se não há diálogo aberto na tela.
2. As seis telas passam a usá-lo no lugar do `@HostListener` próprio.
3. Testes do utilitário (dentro do prazo não recarrega; fora, recarrega uma vez mesmo com `visibilitychange` e `focus` juntos).

## Critérios de Aceite

- Ao vivo: sair e voltar à aba duas vezes em 10 s numa dessas telas gera no máximo uma recarga da lista.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A execução ativa da topbar (spec `331-execucao-ativa-consulta-com-guarda`) e a reconexão do chat.

## Dependências

Nenhuma.

