# 297 — Lint e padrão do código

> Task 1/3 de `padronizacao-e-lint.spec.md`. Origem I-002/P-001. Execução aprovada para todo o código existente em 2026-10-31.

## Objetivo

Instalar verificações permanentes de convenções e corrigir o código existente dos quatro workspaces e dos scripts, com quatro espaços e preservação das quebras escolhidas no TypeScript.

## Entregáveis

1. ESLint com TypeScript/Angular, regras de segurança e nomenclatura objetivamente verificáveis, sem prometer detectar o significado de toda abreviação. Corrigir violações no código existente; não introduzir listas de arquivos legados liberados ou desligar regras só para ocultar achados.
2. Indentação de quatro espaços sem tabs em código/configurações mutáveis. TypeScript não passa por Prettier, não ganha limite automático de largura nem quebra compulsória de linhas; preservar dados em literais, prompts, fixtures e SQL.
3. Prettier limitado a HTML/SCSS, com quatro espaços, validação de templates e SCSS e scripts de checagem/correção explícitos. Editor e CI usam as mesmas regras. Configurações JSON/JS/YAML mutáveis seguem quatro espaços quando estruturalmente compatíveis; lockfile gerado não é formatado manualmente.
4. Comando de lint na raiz e nos workspaces, gates no CI e verificação de convenções estruturais/SQL das tasks 298/299. Documentar escopo e comandos reais em português; atualizar AGENTS/CLAUDE e skills espelhadas quando necessário, sem divergir.

## Critérios de Aceite

- Inventário antes da escrita; fixes aplicados somente aos caminhos revisados. Testes de regras/ferramentas próprias usam exemplos válidos e inválidos e executam o verificador real.
- Lint/formatação sem pendências nos quatro workspaces e scripts; `npm test`, `npm run test:integracao`, builds backend/frontend/desktop e `npm run repo:verificar` aprovados. Verificações exigidas que não puderem rodar ficam pendentes, sem declarar conclusão integral.
- Conferir diff por tokens/AST quando aplicável e ler mudanças não mecânicas; strings e conteúdo de negócio preservados. Rever todo o diff pelas convenções.
- UI: executar o frontend real e inspecionar os consumidores/análogos afetados em 1920×1080, 1366×768 e 1080×1920, claro/escuro; whitespace de texto, CSS e estados relevantes preservados.

## Fora de Escopo

Reformatar TypeScript com Prettier; alterar regras de negócio, contratos serializados, conteúdo de prompts ou fixtures; reescrever migrations aplicadas, históricos de docs, lockfiles ou mídia gerada. Reformas arquiteturais sem relação com um achado de lint.

## Dependências

Tasks 298 e 299 para o gate integrado; documentos canônicos e decisão do autor. Anexo de execução: `297-lint-e-padrao-do-codigo/plano.md`.
