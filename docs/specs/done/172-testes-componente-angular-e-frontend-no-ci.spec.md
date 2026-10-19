# Task 172 — Testes: componente Angular, frontend na raiz e no CI

> Task 2/17 da guarda-chuva [`testes-automatizados.spec.md`](../backlog/testes-automatizados.spec.md). Origem: decisão do autor em
> 2026-10-18 de testar componentes além da lógica pura ([análise](../backlog/testes-automatizados/ANALISE.md) §3).

## Objetivo

Permitir testar componentes e páginas Angular 21 (standalone, Signals, PrimeNG 21), colocar todos os testes do frontend e
do desktop em `npm test` e no CI, medir a cobertura e corrigir a documentação que diz que o frontend não tem testes.

## Entregáveis

1. **Ferramenta de teste de componente.** Escolher e configurar, registrando a escolha e o porquê no `HISTORY.md`:
   preferência pelo caminho oficial do Angular 21 (`@angular/build:unit-test` com Vitest e jsdom); alternativa aceitável
   se o oficial não conviver com o builder atual (`@angular-devkit/build-angular:application`) sem trocar o build de
   produção. **Não trocar o builder de build/serve** nesta task. Requisitos: componentes standalone, `TestBed`, Signals,
   `provideHttpClientTesting`, roteador de teste, tema PrimeNG carregado o bastante para os componentes renderizarem, e
   resolução de `@project20/shared` (hoje exige `--conditions=import`).
2. **Convivência com os testes atuais.** Os 61 testes de lógica em `node:test` continuam passando, no runner atual ou
   migrados para o novo (decidir um; dois runners só se o custo de migrar for desproporcional, justificado no fecho).
   Convenção de nome de arquivo de componente definida e escrita em `docs/CONVENTIONS.md`.
3. **Utilitários de teste.** Helpers mínimos reutilizáveis: montar componente com usuário autenticado de um tipo
   (desenvolvedor, gestor, administrador), responder requisições HTTP esperadas, avançar Signals/efeitos.
4. **Componente de referência.** Dois componentes testados de ponta a ponta como modelo: um formulário (validação,
   envio, erro do backend) e uma listagem (vazio, carregando, cheio, erro). Sugestão: a tela de Tags (`modules/tag`),
   pequena e estável.
5. **Raiz e CI.** `npm test` na raiz passa a rodar também `frontend` e `desktop`; `ci.yml` ganha os passos de teste do
   frontend e do desktop.
6. **Cobertura medida.** Comando que gera relatório de cobertura por workspace (`--experimental-test-coverage` do Node ou
   o da ferramenta escolhida), sem gate de porcentagem; saída em `.artifacts/`, ignorada pelo Git.
7. **Documentação corrigida.** `CLAUDE.md`/`AGENTS.md` (idênticos), skill `task-flow` (`.claude`/`.agents` idênticos),
   `docs/CONVENTIONS.md` e `PROBLEMS.md` P-001 deixam de dizer que o frontend não tem testes; o gate de UI passa a
   incluir os testes de componente (sem substituir a verificação ao vivo).

## Critérios de Aceite

- `npm run test --workspace=frontend` roda lógica e componentes e passa; o mesmo pela raiz `npm test`.
- Um teste de componente propositalmente quebrado (feito e desfeito localmente) faz `npm test` falhar — relatar no fecho.
- `npm run build --workspace=frontend` continua passando e o bundle de produção não inclui código de teste.
- CI verde com os passos novos.
- Relatório de cobertura gerado e o número de partida de cada workspace anotado no `HISTORY.md`.

## Fora de Escopo

- Testar os demais componentes (cada task de domínio e a 187 cobrem os seus).
- Testes ponta a ponta (Playwright) e regressão visual por captura.
- Trocar o builder de produção ou atualizar Angular/PrimeNG.
- Lint.

## Dependências

Nenhuma. Fontes: `docs/SYSTEM.SPEC.md` §8, `docs/CONVENTIONS.md`. Memórias de campo: diretiva PrimeNG sem módulo em
`imports[]` compila e não aplica; itens de `ContextMenu` são propriedade, não getter.

## Riscos e Mitigação

- **Ferramenta que exige trocar o builder:** parar e levar ao autor antes de trocar.
- **Testes de componente frágeis (presos ao DOM do PrimeNG):** consultar por papel/texto acessível, não por classe
  interna do PrimeNG.
