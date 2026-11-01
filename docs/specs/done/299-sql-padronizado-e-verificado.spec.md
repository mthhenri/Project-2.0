# 299 — SQL padronizado e verificado

> Task 3/3 de `padronizacao-e-lint.spec.md`, aprovada em 2026-10-31.

## Objetivo

Organizar as consultas SQL existentes sem alterar seus resultados e manter uma checagem reproduzível do padrão.

## Entregáveis

1. Inventariar SQL de repositories/BaseRepository e demais fontes operacionais mutáveis; organizar cláusulas, listas, subconsultas e indentação de quatro espaços, preservando parâmetros nomeados, casts, comentários relevantes e interpolações de fragmentos existentes.
2. Verificador/formatador com detecção sintática das consultas: não tratar qualquer string como SQL, nem alterar dados dentro de literais. Recortes que exigirem tratamento específico são explicitados, testados e resolvidos, sem ignorar silenciosamente arquivos difíceis.
3. Preservar migrations aplicadas e validar equivalência dos tokens/estrutura de SQL antes/depois, além dos testes de integração reais.

## Critérios de Aceite

Verificador aprovado no inventário todo; testes da ferramenta cobrem idempotência, parâmetros, strings e interpolação/fragments. Integração de repositories no PostgreSQL e build/testes backend passam. Diff revisado contra `SCHEMA.md` e regras SQL canônicas; sem mudanças de schema ou regra.

## Fora de Escopo

Editar migrations históricas; modificar regras, permissões, parâmetros, resultados, dados ou arquitetura; corrigir convenções SQL por alteração de semântica sem registrar separadamente a necessidade.

## Dependências

297 instala ferramentas e integra comandos ao CI; skill sql-migrations, `SYSTEM.SPEC.md` §9, `CONVENTIONS.md` e `SCHEMA.md`.
