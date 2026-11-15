# 437-listas-cancelam-a-consulta-anterior.spec.md

> Task 109/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-137, A-138 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend (atividade, execucao, ponto, projeto, configuracao-ia).

## Objetivo

Trocar de dia em Execuções, de mês no Ponto, de filtro em Atividades e de período em Volume e Custos deixa de empilhar requisições e de correr o risco de uma resposta atrasada sobrescrever a mais nova.

## Contexto

**A-137 · Média · Listas não cancelam a requisição anterior: resposta atrasada pode sobrescrever a mais nova**

`buscarAtividades`, `buscarExecucoes` e `carregarMensal` assinam uma requisição nova a cada mudança sem cancelar a anterior e gravam o que chegar por último. Trocar de dia com as setas em /execucao (sem debounce; tecla segurada dispara em série), de mês em /ponto, ou buscar e paginar em /atividade pode deixar a lista de um filtro sob o cabeçalho de outro. A guarda `carregando` ainda é desligada pelo `finalize` da primeira resposta com a segunda em voo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:290-306 — `listar(filtros).pipe(finalize(...)).subscribe(...)` grava `atividades.set(resposta.dados.itens)`; :236-238 — a busca tem `debounceTime(400)` e `distinctUntilChanged`, sem `switchMap`
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:245-265 — mesmo padrão; :213-214 e :334-338 — setas navegam um dia por tecla
- frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:277-284 — `consultarMensal(filtros)...subscribe` grava `pontoMensal`; :231-237 — `deslocarMes`

Como observar: Não executado. Com a rede limitada no DevTools, em /execucao apertar a seta para a esquerda várias vezes rápido: várias GET /execucao?data=... ficam pendentes juntas, nenhuma é cancelada, e a lista final pode não ser a do dia mostrado.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-138 · Média · Volume e Custos: cada clique na navegação de período dispara uma consulta, sem cancelar a anterior nem reaproveitar o que já veio**

As setas de mês/ano chamam carregar() direto: cliques seguidos deixam várias consultas em voo e só a resposta é descartada. Alternar Mensal/Anual refaz a consulta mesmo com os dados daquele período já em memória, e alternar Projetos/Volume na listagem desmonta o componente e pede tudo de novo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:105-110 e 127-131 — escolherMes/escolherAno chamam carregar() a cada clique
- frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:84-87 — troca de período sempre chama carregar()
- frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:167-168 e 180 — a resposta atrasada é só ignorada (comparação com mes()/ano())
- frontend/src/app/modules/configuracao-ia/components/custos-aba/custos-aba.component.ts:103-126 e 147-148 — anterior()/proximo()/irParaAtual() chamam carregar(); resposta de outro período é descartada
- frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.html:20-21 — o componente de volume vive dentro de @if e é recriado a cada troca de visão

Como observar: Em /projeto visão Volume, clicar cinco vezes rápido na seta de mês anterior. Na rede: cinco GET /projeto/volume?ano&mes, todos concluídos, só o último usado.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Cada uma dessas cargas passa por um fluxo que cancela a anterior (`switchMap`) ou guarda e cancela a assinatura.
2. Em Volume e Custos, o que já foi carregado para um ano/mês é reaproveitado enquanto a tela está aberta.
3. Testes de componente com duas trocas em sequência e a primeira resposta chegando depois.

## Critérios de Aceite

- Ao vivo: segurar a seta de dia em Execuções deixa as consultas anteriores como canceladas e a tela mostra o último dia pedido.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A listagem de Usuários (spec `345-usuarios-busca-filtro-e-paginador`) e a seleção de demandas (spec `411-demanda-selecao-rapida-cancela-a-carga-anterior`).

## Dependências

Nenhuma.

