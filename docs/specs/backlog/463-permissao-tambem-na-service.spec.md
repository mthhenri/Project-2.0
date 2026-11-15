# 463-permissao-tambem-na-service.spec.md

> Task 135/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-183, A-184 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend (projeto, calendario, tag, relatorio, ponto-justificativa, modelagem, ia, configuracao-ia).

## Objetivo

As services desses módulos passam a conferir quem pode, como manda a convenção do projeto ("a service concentra validações e permissões"). Hoje os métodos de escrita nem recebem o usuário: quem barra é só o `@GestorOnly` ou o `@AdministradorOnly` da rota, e cada executor ou ferramenta de IA que chama a mesma service precisa repetir a regra por conta própria.

## Contexto

**A-183 · Baixa · Trava de tipo só no controller em projeto, calendário, tag, relatório e justificativa**

Nessas services os métodos de escrita não recebem o usuário ativo: quem barra é só o decorador da rota, e cada executor/ferramenta de IA precisa repetir a regra por conta própria. Usuário, prioridade e textos dos tipos conferem na service também, então há dois padrões.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/projeto/services/projeto.service.ts:32, :154, :187 — criar/alterar/excluir sem usuarioAtivo
- backend/src/modules/projeto/executores/criar-projeto.executor.ts:13-14 e :55-57 — 'a ProjetoService.criar não confere o tipo... então o executor confere'
- backend/src/modules/ponto/executores/justificar-ponto.executor.ts:12-13 e :60-62 — mesma repetição para a justificativa
- backend/src/modules/relatorio/controllers/relatorio.controller.ts:33, :43, :55 — service chamada sem usuarioAtivo; grep de usuarioAtivo em relatorio.service.ts sem ocorrência
- backend/src/modules/atividade-prioridade/services/atividade-prioridade.service.ts:30 e backend/src/modules/usuario/services/tipo-usuario-ajuda.service.ts:29 — aqui a service confere de novo

Como observar: Pela API não há diferença hoje (as rotas respondem 403 a quem não pode). O risco é um chamador interno novo (executor, ferramenta, job) chamar ProjetoService.criar ou PontoJustificativaService.criar sem repetir a trava.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-184 · Baixa · Modelagem, duas leituras da IA e a gravação de preço só têm trava no controller; a service não confere tipo**

As cinco escritas da modelagem dependem só do `@GestorOnly()` posto método a método: `ModelagemService` nem recebe `usuarioAtivo`. O mesmo vale para `IaService.recuperarEstadoCompleto`/`listarModelos` e para `ConfiguracaoIaService.alterarPreco`. Os módulos vizinhos (configuracao-ia, prompt, ia-custo) repetem a conferência na service, que é onde a regra do projeto põe a permissão.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/modelagem/services/modelagem.service.ts:38-39 — comentário '(a permissão está nas rotas)'; linhas 56, 69, 81, 97 e 118 — `criarGrupo`, `alterarGrupo`, `excluirGrupo`, `alterarTabela` e `removerTabela` sem `usuarioAtivo`
- backend/src/modules/modelagem/controllers/modelagem.controller.ts:16-43 — `@GestorOnly()` por método, nenhum `@ActiveUser`
- backend/src/modules/ia/services/ia.service.ts:95 e 106 — `recuperarEstadoCompleto()` e `listarModelos()` sem parâmetro de usuário; a trava é só `@AdministradorOnly()` em ia.controller.ts:10 e 17
- backend/src/modules/ia/services/ia.service.ts:89-90 — comentário 'Para a rota de leitura do estado (administrador)' no método que serve a rota aberta `GET /ia/disponibilidade` (ia.controller.ts:24-27)
- backend/src/modules/configuracao-ia/services/configuracao-ia.service.ts:110-113 — `alterarPreco(dto)` grava sem conferir tipo ('que confere a permissão' fica com quem chama)
- backend/src/modules/configuracao-ia/services/configuracao-ia.service.ts:129-134, backend/src/modules/prompt/services/prompt.service.ts:106-111 e backend/src/modules/ia-custo/services/ia-custo.service.ts:72-74 — os vizinhos têm `validarAdministrador` na service ('Defesa em profundidade')

Como observar: Hoje não se reproduz pela API: PUT /modelagem/grupo/1 {titulo, rotulo} como AUXILIAR ou DESENVOLVEDOR dá 403 pelo GestorGuard e GET /ia/estado dá 403 pelo AdministradorGuard (esperado = obtido). A diferença só aparece se uma rota nova nascer sem decorador ou outro módulo chamar a service: nada barra.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. As escritas de `ProjetoService`, `CalendarioService`, `TagService`, `RelatorioService`, `PontoJustificativaService` e `ModelagemService`, mais `IaService.recuperarEstadoCompleto`/`listarModelos` e `ConfiguracaoIaService.alterarPreco`, recebem o usuário ativo e conferem a permissão pela função do `shared`.
2. A regra repetida sai dos executores e das ferramentas de IA que chamam essas services.
3. Teste por tipo de usuário em cada service; os decoradores das rotas ficam.

## Critérios de Aceite

- Chamar cada service com um usuário sem permissão lança `UnauthorizedAccessException` mesmo sem passar pelo controller (teste da service).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar quem pode o quê. `ExecucaoService.registrar` e `excluir` têm spec própria.

## Dependências

Nenhuma.

