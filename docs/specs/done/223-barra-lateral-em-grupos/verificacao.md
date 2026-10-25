# Verificação — task 223, barra lateral em grupos

> 2026-10-25. Capturas locais em `.artifacts/223-barra-lateral-em-grupos/` (não vêm no clone); o veredito abaixo não depende delas.

## Método

- Stack que já estava no ar (API em `:3000`, front em `:4200` com recarga automática, banco de desenvolvimento), no navegador do app.
- Sessão do `gestor.inicial` (administrador, senha do seed `0015`). Para ver a barra como **gestor** e **desenvolvedor**, o tipo do usuário
  foi trocado só no `localStorage` (`usuario_sessao`), que é o que a barra lê (`UsuarioSessaoService.eGestor`/`eAdministrador`). As
  chamadas à API seguiram como administrador: isso não mexe na barra, mas a verificação não exercitou um login real de gestor ou
  desenvolvedor (os testes de componente cobrem os três tipos).
- Leitura dos grupos e posições pelo DOM, mais capturas.

## Estados verificados

| Estado | Resultado |
|---|---|
| Administrador, 1920×1080, claro, expandida | Dia a dia (Chat, Atividades, Execuções, Ponto), Projetos (Projetos, Demandas), Gestão (Calendário, Tags, Usuários), IA (IA Config.); Modelagem no fundo, logo acima de "Recolher" |
| Gestor, 1920×1080 | Dia a dia, Projetos, Gestão; o grupo IA some (IA Config. é só do administrador) |
| Desenvolvedor, 1920×1080 | Dia a dia e Projetos (só Demandas); Gestão e IA somem; Modelagem no fundo |
| Administrador, 1366×768 | tudo cabe sem rolagem (`scrollHeight` = `clientHeight` = 659 px); fim do grupo IA em 612 px, Modelagem em 647 px, rodapé em 715 px |
| Administrador, 1366×768, recolhida, escuro | só a linha entre os grupos, ícones centralizados, Modelagem separada no fundo |
| Administrador, 1366×768, expandida, escuro | título cinza e linha legíveis no escuro (`--p-text-muted-color` e `--app-surface-200`) |
| Administrador, 1080×1920, escuro | grupos no topo e Modelagem no fundo, sem rolagem |

Análogo: a barra lateral anterior (mesma largura, item ativo, recolhida e tema escuro); só mudaram a ordem, os separadores e a posição da Modelagem.

## Testes e build

- `ng test --include` em `navegacao.test.ts` e `sidebar.component.spec.ts`: **38 de 38** passaram (13 de lógica, com o agrupamento nos três
  perfis, e os de componente, com 6 novos de grupos).
- `npm run test --workspace=frontend`: 1839 passaram e **6 falharam**, todos fora desta task (editor de Markdown e chat entre
  colaboradores, de 6 a 12 s cada). Rodados à parte, os 12 arquivos (173 testes) passam: registrado como `PROBLEMS.md` P-034.
- `npm run build --workspace=frontend`: compilou; só os avisos de orçamento que já existiam.
- Sem lint no projeto (`PROBLEMS.md` P-001).

## Limites

- O estado "tela substituída pelo chat" (`desabilitado`) não acontece hoje com nenhum item; seguiu coberto só pelo template e pelos testes
  que já existiam.
