# 406-escritas-com-a-funcao-de-permissao-da-acao.spec.md

> Task 78/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-101, A-102 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/demanda, atividade e execucao.

## Objetivo

Cada escrita usa a função de permissão que foi criada para ela. Hoje criar demanda raiz, editar sem ser membro, atribuir tag, mexer em membro de outro, alterar atividade alheia e iniciar, encerrar e editar execução alheia são decididos por `temVisibilidadeTotal`, que é a função de leitura; funciona porque hoje todas resolvem para os mesmos tipos.

## Contexto

**A-101 · Baixa · Escritas de demanda decididas com temVisibilidadeTotal em vez das funções de ação**

Criar raiz, editar sem ser membro, atribuir tag e mexer em membro de outro são decididos por temVisibilidadeTotal, função de leitura, enquanto existem podeEditarDemanda e podeAtribuirMembroOuTag para essas ações. Hoje as três resolvem para o mesmo conjunto de tipos, então o comportamento é igual; a divergência aparece no dia em que uma delas mudar. A ferramenta de IA de membro já usa podeAtribuirMembroOuTag, a rota não.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:76, 84, 125 — criar decide raiz, acesso e membros por temVisibilidadeTotal
- backend/src/modules/demanda/services/demanda.service.ts:460 — recuperarDemandaParaEditar; 777 — alterarTagsDemanda; 874 — atribuirMembro; 941 — removerMembro
- backend/src/modules/demanda/services/demanda.service.ts:40-43 — podeAtribuirMembroOuTag nem é importada na service
- backend/src/modules/demanda/ferramentas/propor-atribuir-membro.ferramenta.ts:43 — a ferramenta usa podeAtribuirMembroOuTag
- shared/src/utils/permissao-usuario.ts:37-62 — as três funções devolvem conduzOTrabalho(tipo)

Como observar: Não reproduzível pela API hoje (mesmo resultado para os quatro tipos); visível só na leitura do código.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-102 · Baixa · Escritas autorizadas com temVisibilidadeTotal em vez da função da ação**

As services decidem quem altera atividade/tags e quem inicia, encerra e edita execução alheia com `temVisibilidadeTotal`, a função de leitura. `podeConduzirExecucaoDeOutro` só aparece numa leitura, e `podeEditarExecucaoDeOutro`, `podeAtribuirMembroOuTag` e `podeVerExecucaoEPontoDeOutro` não são usadas nessas services. Hoje todas resolvem em `conduzOTrabalho`, então o resultado é igual; um tipo novo só com visão total ganharia as escritas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/services/atividade.service.ts:202 e 329 — alterar e alterarTags usam temVisibilidadeTotal
- backend/src/modules/execucao/services/execucao.service.ts:105, 205 e 364 — iniciar, encerrar e alterar usam temVisibilidadeTotal
- backend/src/modules/execucao/services/execucao.service.ts:265 — podeConduzirExecucaoDeOutro só em recuperarAtivaDoUsuario (leitura)
- backend/src/modules/execucao/services/execucao.service.ts:22-27 — imports sem podeEditarExecucaoDeOutro nem podeVerExecucaoEPontoDeOutro
- backend/src/modules/execucao/ferramentas/propor-iniciar-execucao.ferramenta.ts:54 e propor-pausar-execucao.ferramenta.ts:38 — as ferramentas usam podeConduzirExecucaoDeOutro
- shared/src/utils/permissao-usuario.ts:37-39 e 65-82 — todas delegam a conduzOTrabalho

Como observar: Sem diferença observável pela API hoje; aparece só na leitura do código (grep das funções `pode*` nas duas services).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Nas services de demanda, atividade e execução: `podeEditarDemanda`, `podeAtribuirMembroOuTag`, `podeEditarAtividadeDeOutro`, `podeConduzirExecucaoDeOutro`, `podeEditarExecucaoDeOutro` e `podeVerExecucaoEPontoDeOutro` nos pontos correspondentes; `temVisibilidadeTotal` fica só nas leituras.
2. Nenhuma mudança de comportamento: os testes existentes continuam passando sem ajuste.

## Critérios de Aceite

- Testes das três services sem alteração de expectativa; revisão do diff confirma uma função por ação.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar quem pode o quê.

## Dependências

Nenhuma.

