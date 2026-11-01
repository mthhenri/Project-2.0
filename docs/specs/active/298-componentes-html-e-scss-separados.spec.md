# 298 — Componentes, HTML e SCSS separados

> Task 2/3 de `padronizacao-e-lint.spec.md`, aprovada em 2026-10-31.

## Objetivo

Aplicar a separação TS/HTML/SCSS a todos os componentes e padronizar a apresentação dos fontes HTML e SCSS com quatro espaços.

## Entregáveis

1. Inventário AST de componentes: extrair todo template/estilo inline para arquivos externos e referenciar HTML/SCSS explícitos, mesmo em wrappers de uma linha e componentes sem estilos (SCSS vazio). Não confundir strings de fixture com metadados de componente.
2. Formatar todos os HTML/SCSS mutáveis do frontend e validar templates/folhas de estilo pelos gates da 297. Preservar conteúdo, espaço significativo e comportamento de seletores/declarations; não aproveitar para redesenhar a tela.
3. Verificação permanente da separação e dos três arquivos, com teste em exemplos reais e proteção contra novos templates/estilos inline.

## Critérios de Aceite

Todos os componentes do inventário cumprem o contrato; testes de componente e build passam. Inspeção do app real nos três tamanhos e dois temas pela skill verify, com análogos nas telas existentes e estados relevantes. Extrações preservam template e estilo e não alteram dados de fixtures.

## Fora de Escopo

Tema, redesign, biblioteca própria de componentes, templates recebidos como dados de testes e novas funcionalidades.

## Dependências

297 fornece ferramentas e gate integrado; `SYSTEM.SPEC.md` §8, `CONVENTIONS.md`, gerenciamento-de-impacto e verify.
