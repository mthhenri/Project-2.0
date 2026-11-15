# 410-demanda-destinos-de-conexao-vindos-do-grafo.spec.md

> Task 82/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-101 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Abrir a tela deixa de pedir a lista de demandas do projeto, que repete o que `GET /demanda/grafo` acabou de trazer e fica desatualizada.

## Contexto

**A-101 · Média · GET /demanda?projetoId&allRows repete o que o grafo já trouxe, é carga antecipada e fica desatualizada**

Grafo, lista e árvore trazem o mesmo conjunto: o nó do grafo tem tudo de DemandaResumoDto e de DemandaArvoreItemDto, menos caminho, nivel e filhos, deriváveis de demandaPaiId. A lista só alimenta os destinos do "Conectar" (id e nome), é pedida ao abrir a primeira demanda mesmo sem ninguém conectar nada, nunca serve ao desenvolvedor (o botão é de quem edita) e é refeita sempre que a coluna é recriada. Como só recarrega quando o projeto muda, demanda criada, renomeada ou excluída depois não aparece certa nos destinos.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:406 e 431-446 — carregarDemandasParaConexao -> listar({ projetoId, allRows: true }), guardada por projetoDasDemandas (só muda com o projeto)
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:93-95 — único consumo: destinosConexao (id e nome)
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:245-246 — [todasDemandas]="destinosConexao()" ao lado de [grafo]="grafo()"
- frontend/src/app/modules/demanda/components/demanda-conexao-lista/demanda-conexao-lista.component.html:9 e 22 — "Conectar" só com sessao.podeEditarDemanda()
- shared/src/dtos/demanda/DemandaGrafoNoDto.ts, DemandaResumoDto.ts e DemandaArvoreItemDto.ts — campos comparados
- backend/src/modules/demanda/services/demanda.service.ts:196-201 — listar sem restrição para quem tem visão total (mesmo conjunto do grafo)
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:110-124 — a tela já calcula o caminho de cada demanda a partir dos nós
- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:395-398 — o diálogo pede uma terceira forma da lista (estrutural: true, allRows: true) para o campo pai

Como observar: Abrir /demanda?projetoId=<id>: GET /demanda/grafo?projetoId e GET /demanda?projetoId&allRows=true na mesma carga. Criar uma demanda e, sem recarregar, abrir Conexões e Conectar em outra demanda: a nova não está na lista e nenhum GET /demanda?projetoId novo saiu (esta segunda parte foi lida no código, não conferida ao vivo).

Verificação na auditoria: medido na aplicação rodando em 2026-11-13/14 (administrador): abrir `/demanda` com projeto = 10 requisições; selecionar uma demanda = 5 (`/plano/demanda/:id`, `/demanda/:id/detalhe`, `/demanda/:id/arvore`, `/atividade?demandaId`, `/mensagem-direta/canal/demanda/:id`); voltar a uma demanda já vista = as mesmas 5. `GET /demanda?projetoId&allRows=true` sai ao abrir a primeira demanda, antes de alguém pedir para conectar.

## Entregáveis

1. `destinosConexao` derivado de `grafo().nos`; `carregarDemandasParaConexao` sai.
2. Teste de componente: abrir a tela não chama `GET /demanda?projetoId`.

## Critérios de Aceite

- Ao vivo: a abertura da tela tem uma requisição a menos e a lista de destinos inclui uma demanda criada na mesma sessão.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

