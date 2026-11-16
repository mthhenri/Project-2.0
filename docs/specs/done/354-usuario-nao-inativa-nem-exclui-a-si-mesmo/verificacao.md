# 354, 384, 425, 426 e 428 — Verificação

Quinta frente da guarda-chuva `requisicoes-e-permissoes-correcoes`, de 2026-11-16, depois das de `359-.../`, `373-.../`, `335-.../` e `396-.../`. Decisões do autor (cada spec tem a "Decisão do autor"): **354** (opção 1), **384** (por tela), **425** (opção 1), **426** (opção 1) e **428** (opção 1).

## O que mudou

- **354:** `UsuarioService.alterar` (`ativo: false`) e `excluir` recusam, com 400, a própria conta; reativar e editar a si mesmo seguem livres.
- **384:** só a tela de Documentações mudava. `DemandaRepository.listarParaDocumentacao` agora devolve ao desenvolvedor apenas as demandas de que é membro (antes, todas as dos projetos em que era membro de alguma, com `podeEditar` falso nas outras); gestor, administrador e auxiliar veem todas. A criação de atividade, a lista "Minhas demandas" e `GET /demanda` já eram só das dele, e o grafo, a árvore e o detalhe seguem do projeto inteiro. A árvore da tela já aceitava demanda sem a mãe na lista (vira raiz do projeto), então um membro de sub-demanda continua vendo o caminho completo pelo texto `caminho`.
- **425:** `UsuarioResumoDto.login` virou `string | null`. `UsuarioService.listar(filtros, usuarioAtivo)` repassa `incluiLogin` (novo `UsuarioInternoListarDto`) ao repository, que devolve o login só a quem tem permissão de gestor e, sem ele, busca só pelo nome (senão o login seria descoberto por tentativa). A ferramenta de IA `listar_usuarios` repassa quem pede. O seletor de membros da demanda (só de gestor) trata o `null`.
- **426:** `AnotacaoService.validarEscrita` (só o dono) nas cinco escritas; `validarAcesso` ficou só na leitura. O drawer do pad abre o pad de outra pessoa só para leitura (`PadService.ePadProprio`).
- **428:** `UsuarioService.alterar` recusa a promoção de quem atua como desenvolvedor a gestor ou administrador enquanto houver `demanda_usuario` (`UsuarioRepository.validarVinculoComDemanda`) ou execução sem fim (`validarExecucaoAtiva`); trocar entre desenvolvedor e auxiliar, ou entre gestor e administrador, não consulta nada.

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| Backend, unitários | 1861 de 1861; novos: conta própria, promoção com vínculos, `login` por tipo, escrita no pad |
| Integração (PostgreSQL local) | 543 de 543; novos: `validarVinculoComDemanda`, `validarExecucaoAtiva`, `listar` sem login e a documentação só das demandas dele |
| `shared` | 363 de 363 |
| Frontend (Vitest, com `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 238 arquivos, 2894 testes; novo: pad alheio só para leitura |
| `npm run lint:tudo`, builds de backend e frontend | sem erro |

## Ao vivo (backend 3001 e banco `project20_verify` isolados, removidos ao fim)

29 de 30 conferências por API no roteiro (`.artifacts/revisao-permissoes-p0/roteiro5.mjs`; a que falhou era defeito do próprio script, que dava ao usuário um nome contendo o login) e as 3 de `extra5.mjs`, que a refazem com um nome sem relação, todas certas: **354** (400 ao inativar e ao excluir a própria conta; editar a si mesmo e inativar outro, 200), **425** (login nulo para o auxiliar, busca por login sem resultado, busca por nome acha; gestor e administrador veem e buscam pelo login), **426** (gestor e administrador recebem 403 em `PUT`, no `POST .../feito`; o dono escreve; o gestor lê o texto novo e escreve no próprio pad), **384** (documentação do desenvolvedor só com a demanda dele, a do auxiliar com as duas, o grafo com as duas, `GET /demanda` e `atribuidas` só com a dele), **428** (400 para membro de demanda, 200 depois de sair e para a troca desenvolvedor → auxiliar).

Na tela (navegador do app, DOM): com o administrador, `/usuario?anotacoes=<id de um desenvolvedor>` abre "Anotações de Fulano Sem Relacao" sem editor e sem "Limpar".

## Limites

- **Sem verificação visual completa:** o painel do navegador abriu sem área visível (viewport 0×0), então não houve captura nem conferência nos cinco formatos de desktop e nos dois temas; a tela do pad só foi conferida pelo DOM e pelo teste de componente. O modo de leitura do pad já existia (`editavel = false`) e é o mesmo usado em outros pontos.
- **428:** o ramo "execução em andamento sem ser membro" só tem teste de unidade e de repository; ao vivo não há como criar essa situação (a atividade exige o dono membro da demanda). A trava não oferece ação na tela: a mensagem do 400 diz o que tirar, e a pessoa vai à demanda e à execução.
- **425:** o `login` aparece na tela de Usuários e no seletor de membros só para o gestor, que já eram as únicas telas que o usam.
- **426:** o gestor deixa de poder anexar recado no pad de um desenvolvedor, nem pela IA (o executor da IA já escrevia só no pad do token).
- **384:** o desenvolvedor deixa de ver, na tela de Documentações, as demandas dos colegas (antes via em leitura); a leitura delas segue pela visão de demandas do projeto.
