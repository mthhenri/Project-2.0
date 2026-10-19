# Task 187 — Testes: frontend núcleo, componentes compartilhados e fecho da cobertura

> Task 17/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). Última task: também fecha a guarda-chuva.

## Objetivo

Cobrir o que todas as telas usam (serviços do núcleo, interceptors, layout e componentes compartilhados) e conferir que a
cobertura prometida pela guarda-chuva foi entregue.

## Entregáveis

1. **Lógica do núcleo:** `core/interceptors/error-handler.interceptor` (formato de erro do backend vira mensagem;
   401 leva ao login) e `loading.interceptor` (`carregamento.signal`); `core/config/rxjs-erros-http`; serviços
   `desfazer`, `tema`, `tema-personalizado`, `visualizacao-tempo`; utils `atalhos` e `shared/layout/navegacao` (itens por
   tipo de usuário); pipe `data-brasileira`; diretivas `bloquear-caracteres-proibidos` (mesma regra do validador do
   `shared`) e `dialog-formulario` (autofocus e Enter, task 97).
2. **Layout:** `layout`, `sidebar` (itens por tipo; gestor e administrador veem os seus), `topbar`,
   `chip-execucao-ativa` (aparece com execução ativa e some ao encerrar).
3. **Componentes compartilhados:** `markdown-editor` (o interpretador já é testado; aqui, valor de formulário e
   eventos), `markdown-visualizador`, `toast-desfazer` (prazo de 7 s), `seletor-cor`, `prioridade-selo`,
   `skeleton-lista`, `error-message`, `loading-spinner`, `barra-recarga`, `dialog-dica-atalhos`. Os sem lógica podem
   ficar de fora, listados no fecho.
4. **Matriz de permissões:** relatório `docs/specs/<estado>/187-.../MATRIZ-PERMISSOES.md` com cada linha da tabela de
   `SYSTEM.SPEC.md` §14 e as regras de administrador, apontando o(s) teste(s) que a provam; linha sem teste reabre a
   task do domínio.
5. **Fecho da guarda-chuva:** cobertura final por workspace (comando da 172) comparada com o número de partida;
   `PROBLEMS.md` P-001 reescrito (parte de testes removida, lint mantido); guarda-chuva e anexo movidos para `done/`.

## Critérios de Aceite

- Matriz sem linha vazia.
- `npm test`, `test:integracao` e builds verdes.
- Cobertura antes/depois registrada no `HISTORY.md`.

## Fora de Escopo

- Lint (`IDEAS.md` I-002). Regressão visual por captura.

## Dependências

172, 173 e, para os itens 4 e 5, **todas** as tasks 171–186 em `done/`. Fontes: `SYSTEM.SPEC.md` §8, §14.
