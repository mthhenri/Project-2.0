# 473-relatorio-do-projeto-pede-so-o-projeto.spec.md

> Task 145/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-191 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-08.
> Severidade: Baixa. Área: frontend/relatorio.

## Objetivo

Em `/projeto/:id/relatorio` o cabeçalho usa `GET /projeto/:id` em vez de `GET /projeto?allRows=true` só para achar nome, código e cor.

## Contexto

**A-191 · Baixa · Relatório aberto pelo projeto pede a lista inteira de projetos para mostrar a identidade de um**

Em /projeto/:id/relatorio o projeto é fixo e o seletor nem é desenhado, mas a página chama GET /projeto?allRows=true só para achar nome, código e cor do projeto no cabeçalho. Bastaria GET /projeto/:id, que já existe no service.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:204 — iniciar() chama carregarProjetos() sempre
- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:360-366 — carregarProjetos() chama projetoService.listar({ allRows: true })
- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:83 — projetoEscolhido procura o id em projetos()
- frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.html:13 e 48 — o cabeçalho usa projetoEscolhido() quando projetoFixo(); o seletor só existe em @if (!projetoFixo())
- frontend/src/app/modules/projeto/services/projeto.service.ts:72-73 — recuperar(id) faz GET /projeto/:id

Como observar: Abrir /projeto/1 e entrar no relatório do projeto. Na rede: GET /projeto?allRows=true junto com GET /relatorio/execucao?projetoId=1..., sem seletor de projeto na tela.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. Com projeto fixo, a página pede o projeto por id (ou o recebe pelo estado da navegação); teste de componente.

## Critérios de Aceite

- Ao vivo: abrir o relatório de um projeto não pede a lista de projetos.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

