# Continuação — padronização integral

Registro de 31/10/2026 para continuidade por outro agente. A tarefa está **em andamento**; nenhuma das specs 297–299 está pronta para ir a `done/`. As instruções canônicas do repositório e as specs ativas prevalecem sobre este registro.

## Objetivo e decisões do autor

- Aplicar a padronização a **todo o código existente**, não apenas ao código novo, incluindo SQL. O sistema ainda permite essa limpeza ampla.
- Quatro espaços; componentes Angular sempre com arquivos TS, HTML e SCSS separados, inclusive componentes pequenos e hosts de teste.
- Não usar Prettier em TypeScript nem quebrar automaticamente linhas longas. Nomes devem ser descritivos, sem abreviações desnecessárias; manter a arquitetura e os contratos existentes.
- Formatação de HTML e SCSS pode usar Prettier; SQL deve ficar legível e ter verificação reproduzível.
- Migrations já aplicadas e specs históricas não são reescritas, conforme as regras do repositório. Não alterar comportamento ou visual deliberadamente durante a limpeza.

## Referências e ponto de partida

- Specs ativas: `padronizacao-e-lint.spec.md`, `297-lint-e-padrao-do-codigo.spec.md`, `298-componentes-html-e-scss-separados.spec.md` e `299-sql-padronizado-e-verificado.spec.md`; plano em `plano.md` nesta pasta.
- Estratégia consultada: `C:/Users/maths/Documentos/_Code/Contratados/ContratadosRPG/`, adaptada às escolhas acima. Antes de alterar código, releia `AGENTS.md`, `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e `docs/context/CONTEXT.md`.
- Base Git no início desta tarefa: `47c66c8efbf96589448b3b13c84b6b119d8b259e`. A worktree tem alterações extensas e deve ser preservada; não faça reset, descarte ou formatação ampla adicional sem inventário. Confira `git status` antes de prosseguir.
- Evidências temporárias estão em `.artifacts/297-padronizacao/`, ignorada pelo Git e possivelmente indisponível em outro ambiente. Não dependa dela como única fonte de verdade; regenere as verificações quando necessário.

## Trabalho realizado, ainda sujeito a revisão

- Inventário inicial de fontes e dependências; dependências de desenvolvimento instaladas no pacote raiz e lockfile atualizado. O npm informou vulnerabilidades existentes no conjunto de dependências; não houve `audit fix` indiscriminado.
- Criados `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs` e `stylelint.config.mjs`. TS está excluído do Prettier. Configuração ESLint usa regras recomendadas e regras próprias para componentes externos e alguns identificadores abreviados.
- Criados `scripts/eslint/regras.mjs` e `scripts/eslint/regras.test.mjs`; duas contraprovas passaram, inclusive casos inválidos. As regras ainda precisam ser integradas aos comandos e ao CI, e sua cobertura deve ser avaliada criticamente.
- A extração dos componentes foi feita: inventário apontou 144 componentes, incluindo 11 hosts de teste, com recursos externos. Um teste focado reportou 12 suítes e 142 testes passando antes das alterações globais subsequentes. Conferir novamente após a integração.
- SQL de execução foi formatado em 66 arquivos, incluindo repositories, infraestrutura, scripts, testes e dois arquivos SQL operacionais. Criados `scripts/formatar-sql.mjs` e `scripts/formatar-sql.test.mjs`; 11 testes passaram antes da indentação global. O formatador verifica tokens e inclui SQL dinâmico, parâmetros e casos especiais. Migrations foram preservadas. A revisão independente do diff e os testes de integração ainda são obrigatórios.
- ESLint aplicou correções automáticas de indentação no código; HTML e SCSS do frontend receberam Prettier. Isso afeta muitos arquivos: revisar especialmente literais multilinha, conteúdo HTML e SQL, além de comportamento renderizado. Não presumir que a correção mecânica seja semanticamente neutra.
- Diagnóstico anterior à última rodada: aproximadamente 500 ocorrências de lint restantes, entre nomes abreviados, `any`, acessibilidade de templates, estilos inline e variáveis não usadas. O relatório local foi `.artifacts/297-padronizacao/eslint-restante.json`; linhas de HTML podem estar desatualizadas após o Prettier. Stylelint foi executado, mas seu JSON saiu em stderr; a contagem ainda precisa ser apurada.
- Os agentes que cuidariam das correções restantes foram interrompidos pelo limite de uso antes de reportar conclusão. **Não assuma que essas correções foram feitas**; confira o estado real antes de atribuir trabalho ou modificar os mesmos arquivos.

## Próximos passos

1. Revalidar inventário e `git status`; executar ESLint e Stylelint novamente e registrar resultados. Corrigir todos os achados reais em frontend, backend, shared, desktop e scripts, sem dispensar o legado nem desligar regras só para passar. Preservar nomes de campos serializados, chaves de API e parâmetros SQL ao renomear identificadores. Associações de labels, teclado e estilos de diálogos exigem atenção à semântica e à aparência.
2. Após qualquer alteração de indentação TS ou SQL, rodar `node scripts/formatar-sql.mjs` e depois `node scripts/formatar-sql.mjs --check`, além de `node --test scripts/formatar-sql.test.mjs`. Revisar se a indentação das queries dinâmicas e o check abrangem corretamente todos os usos operacionais.
3. Concluir comandos permanentes de lint e verificação de formato no `package.json`, editor e CI. Assegurar quatro espaços também nas configurações mutáveis, preservando o lockfile gerado. Não aplicar Prettier a TS. Testar as regras próprias contra exemplos válidos e inválidos.
4. Rodar testes e builds dos workspaces afetados, testes de integração dos repositories contra PostgreSQL e `npm run repo:verificar`. Verificar o frontend real nos tamanhos 1920×1080, 1366×768 e 1080×1920, nos temas claro e escuro, percorrendo estados pertinentes. Build ou captura de agente não substituem inspeção pelo agente principal. Para testes frontend neste ambiente, se houver problema de cache temporário, apontar `TEMP` e `TMP` para uma pasta dentro de `.artifacts/297-padronizacao/`.
5. Pedir revisão independente proporcional ao refactor amplo, revisar o diff completo e corrigir diferenças não intencionais. Atualizar `docs/CONVENTIONS.md`, `docs/SYSTEM.SPEC.md`, contexto, prioridades e problema P-001 conforme o resultado; espelhar alterações em `AGENTS.md`/`CLAUDE.md` e nas skills quando aplicável. Só mover specs para `done/` após todos os gates, com registro verificável.

Nenhum commit desta tarefa foi criado. Não executar commit ou push automaticamente apenas por existir este checkpoint.

## Retomada posterior

- Stylelint foi corrigido e passou para todos os SCSS; preservado o `background` de fallback no chip da toolbar.
- Corrigidos nomes locais abreviados no diff por palavra e na comparação de versões; ESLint desses dois arquivos passou e os 298 testes do shared passaram. Impacto do diff: um consumidor no frontend e um teste no shared.
- O SQL foi novamente alinhado depois da indentação TS: `--check` passou em 533 fontes e os 11 testes do formatador passaram. Repetir ao alterar TS ou SQL relevante.
- `npm run repo:verificar` passou. O diagnóstico global anterior às pequenas correções registrou 536 ocorrências de lint; ainda faltam as correções globais, integração do CI, builds, integração PostgreSQL, verificação visual e revisão independente.
