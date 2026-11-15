# 409-demanda-alteracao-local-sem-recarregar-o-grafo.spec.md

> Task 81/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-104 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Renomear, mexer em membro, criar ou remover conexão e trocar status deixam de disparar `GET /demanda/grafo` do projeto inteiro e a releitura da demanda quando a tela já aplicou a mudança.

## Contexto

**A-104 · Média · Toda alteração feita na demanda aberta recarrega o grafo do projeto e relê a demanda, mesmo com a tela já atualizada**

Renomear, adicionar ou remover membro, criar ou remover conexão e trocar status pela bolinha da linha terminam em aoAlteradoPlanejamento() (ou em recarregar()), que dispara GET /demanda/grafo do projeto inteiro e GET /demanda/:id. A tela já aplicou a mudança de forma otimista, o PUT devolve a demanda inteira (DemandaAlteradaDto, ignorado) e, no caso de membros, o nó do grafo nem carrega esse dado. Status pelo chip e tags do cabeçalho já mostram o caminho certo: atualizam o nó sem requisição.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:273-275 — renomear: estado local já trocado; next: () => this.demandaAlterada.emit() ignora a resposta do PUT
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:145 e 248 — (membrosAlterados) e (conexoesAlteradas) -> demandaAlterada.emit()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:320-327 — status pela bolinha: após o PUT, this.recarregar() (GET /demanda/:id) se for a demanda aberta
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:302-304 — recarregarGrafo() + arvoreTela.recarregar() para qualquer alterado
- frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.ts:294-300 e 462 — diálogos do menu de contexto emitem alterado: a demanda aberta é relida mesmo quando a editada é outra
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:314-346 — aoStatusAlterado, aoHorasEstimadasAlteradas e aoTagsAlteradas já atualizam o nó sem recarregar
- shared/src/dtos/demanda/DemandaAlteradaDto.ts — a resposta do PUT traz nome, status, horas, previsão e podeEditar
- shared/src/dtos/demanda/DemandaGrafoNoDto.ts — nó do grafo sem membros

Como observar: Renomear o título inline: PUT /demanda/:id, depois GET /demanda/grafo e GET /demanda/:id. Adicionar um membro no cabeçalho: POST /demanda/:id/membro, depois GET /demanda/grafo e GET /demanda/:id. Trocar o status pela bolinha da linha da demanda aberta: PUT /demanda/:id, depois GET /demanda/:id.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Os componentes emitem o que mudou (como status e tags já fazem) e a página aplica no nó do grafo.
2. O grafo só é recarregado quando a estrutura muda: criar, excluir, mudar pai ou estrutural, conexões.
3. Testes de componente por tipo de alteração.

## Critérios de Aceite

- Ao vivo: renomear uma demanda gera só o `PUT`; criar uma sub-demanda continua recarregando o grafo.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O que a exclusão e a edição pelo diálogo recarregam (specs próprias).

## Dependências

Nenhuma.

