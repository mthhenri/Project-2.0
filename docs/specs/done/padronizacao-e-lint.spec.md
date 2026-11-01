# Padronização integral e lint

> Fase aprovada pelo autor em 2026-10-31. Origem: I-002/P-001; estratégia do Contratados RPG adaptada ao Project. Aplicar também ao código existente, não apenas ao novo.

## Objetivo

Automatizar e aplicar as convenções de legibilidade nos quatro workspaces, com quatro espaços, componentes separados e SQL organizado, preservando comportamento e aparência.

## Entregáveis

1. **297 — Ferramentas e TypeScript:** lint dos quatro workspaces e scripts, indentação de quatro espaços sem Prettier nem quebra automática das linhas TS, configurações coerentes de editor/CI e correção das violações existentes.
2. **298 — Componentes e apresentação:** todo componente com TS/HTML/SCSS separados, inclusive pequeno; HTML/SCSS existentes formatados e validados. Extração estrutural seguida da formatação do inventário completo.
3. **299 — SQL legível:** padronizar queries de repositories e SQL operacional mutável, com comandos de verificação/manutenção e prova de preservação. Migrations históricas permanecem intactas.

## Critérios de Aceite

Tasks 297–299 concluídas com lint/formatação sem violações no escopo, testes dos quatro workspaces, integração de repositories, builds e inspeção real do frontend nos três tamanhos e dois temas. Nenhuma regra de domínio alterada nem enfraquecimento silencioso para aceitar o legado. Evidências e limites nos anexos numerados.

## Fora de Escopo

Migrations já aplicadas, specs em done/discarded e documentos históricos; arquivos gerados, dependências e artefatos. Nenhuma atualização de SDK de IA, tema, funcionalidade ou arquitetura de domínio. Strings de dados/fixtures não são templates de componentes e devem manter seu conteúdo.

## Dependências

`SYSTEM.SPEC.md`, `CONVENTIONS.md`, `SCHEMA.md`, AGENTS/CLAUDE e as decisões do autor nesta conversa.
