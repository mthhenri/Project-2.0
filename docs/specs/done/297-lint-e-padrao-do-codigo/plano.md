# Padronização integral — plano de implementação

> Execução autorizada pelo autor: aplicar também ao legado. Seguir task-flow, sql-migrations, gerenciamento-de-impacto, conventions-check e verify; destino conforme SYSTEM.SPEC §3.1.

**Objetivo:** quatro espaços, componentes em três arquivos, SQL legível e gates permanentes, preservando comportamento e quebras do TypeScript.

**Arquitetura:** ferramentas na raiz, configurações por linguagem/workspace e fontes corrigidos em lotes explícitos. Nenhuma regra de domínio migra de camada. TypeScript usa correções específicas de lint, sem Prettier e sem limite de largura.

**Specs:** 297, 298 e 299; guarda-chuva `../padronizacao-e-lint.spec.md`.

## Restrições

- Preservar a worktree e coordenar responsabilidades antes de cada lote. Workers não comitam, não fazem push nem delegam.
- Migrations aplicadas, specs históricas, dependências e saídas geradas não recebem reformatação.
- Literais de dados, Markdown, prompts e SQL não podem mudar por indentação do arquivo TS.
- Análogos visuais são as próprias telas antes da padronização; proibir mudanças de estilo renderizado sem necessidade.

## Execução

- [x] Inventariar fontes e registrar ponto de partida em `.artifacts/297-padronizacao/`.
- [ ] Instalar dependências de desenvolvimento compatíveis; criar configurações/scripts e contraprovas válidas/inválidas das ferramentas próprias.
- [ ] Worker SQL: normalizar queries e fornecer check reproduzível com preservação de tokens; root integra dependências e comandos.
- [ ] Worker componentes: extrair templates/estilos e completar três arquivos em todo componente; root roda formatação HTML/SCSS após concluir esse lote.
- [ ] Root: aplicar indentação TS específica e corrigir achados reais do lint, sem quebra de linha automática; formatar configurações mutáveis.
- [ ] Rodar lint e checks globais; corrigir até zerar, sem dispensas de legado.
- [ ] Rodar testes e builds dos quatro workspaces e integração PostgreSQL; investigar falhas separando as preexistentes.
- [ ] Inspecionar frontend real nos três tamanhos e temas, consolidar revisão independente da alteração ampla e revisar diffs não mecânicos.
- [ ] Atualizar documentação/espelhos/contexto, repo:verificar e relatórios; mover cada spec apenas se seus gates estiverem cumpridos.

## Pontos de revisão

Whitespace em texto inline e SCSS; conteúdo de template literals; SQL dinâmico e cast de parâmetros; hosts de teste Angular com templates externos; configuração de editor/CI que possa contornar regras. Testes/contraprovas das ferramentas e verificação real cobrem esses riscos.

O estado detalhado, resultados parciais e pendências para retomada estão em [CONTINUACAO.md](CONTINUACAO.md). Os itens que ainda exigem integração ou verificação permanecem desmarcados.
