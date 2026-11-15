# 436-usuarios-ativos-dos-seletores-pelo-catalogo.spec.md

> Task 108/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-136 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-08.
> Severidade: Média. Área: frontend/atividade, execucao e ponto. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Atividades, Execuções, Ponto e o formulário de nova atividade deixam de pedir a lista de usuários ativos a cada entrada.

## Contexto

**A-136 · Média · GET /usuario?ativo=true&allRows=true a cada entrada em /atividade, /execucao e /ponto e a cada 'Nova atividade'**

As três telas e o formulário de nova atividade chamam `usuarioService.listar({ ativo: true, allRows: true })` direto, sem passar pelo catálogo de 60 s que o serviço já tem. A medição mostra a mesma requisição cinco vezes numa navegação curta. O catálogo traz todos os usuários, então o filtro de ativos passaria a ser feito no cliente.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:227 e :797 — `carregarUsuarios()` no `ngOnInit` com `listar({ ativo: true, allRows: true })`
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:170 e :522 — idem
- frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:150 e :288 — idem
- frontend/src/app/modules/atividade/components/atividade-formulario/atividade-formulario.component.ts:87 e :184 — idem, a cada criação do formulário
- frontend/src/app/modules/usuario/services/usuario.service.ts:32-35 e :49-51 — `catalogo` com `listar({ allRows: true })` e `listarCatalogo()`
- shared/src/dtos/usuario/UsuarioResumoDto.ts:21 — `ativo: boolean`
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:12, :19, :23, :104 e :165 — a mesma requisição em cinco seções

Como observar: Navegar /ponto, /atividade, /execucao e voltar a /ponto: cada entrada repete GET /usuario?ativo=true&allRows=true; abrir 'Nova atividade' repete de novo.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: `GET /usuario?ativo=true&allRows=true` sai ao abrir Atividades, Execuções e Ponto e ao voltar a cada uma.

## Decisão do autor pendente

A task 325 decidiu que "as listas `ativo: true` leem sempre do servidor". Esta spec revê essa decisão.

**Antes:** as quatro chamadas usam `usuarioService.listar({ ativo: true, allRows: true })` direto.

**Opções:**

1. Usar `listarCatalogo()` (60 s) e filtrar `ativo` no navegador.
2. Manter a decisão da 325.

## Entregáveis

1. Na opção 1: as quatro chamadas trocadas, com teste de componente de que a segunda tela aberta dentro do prazo não pede a lista.

## Critérios de Aceite

- Ao vivo: abrir Atividades, Execuções e Ponto em seguida faz 1 `GET /usuario` (hoje 3).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

