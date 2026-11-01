# 285-visibilidade-e-atribuicao-do-auxiliar.spec.md

> Task da guarda-chuva `tipo-auxiliar.spec.md` (283–287). Redigida e concluída em 2026-11-01, depois da 284.

## Objetivo

Fechar a regra de visibilidade e de atribuição do Auxiliar: ele vê tudo por tipo, não entra sozinho em `demanda_usuario`, atribui e remove qualquer membro, e a regra de quem pode ser membro (executor) fica explícita e documentada. O código da visibilidade foi feito junto com a 284 (a mesma troca de `tipo === DESENVOLVEDOR` por `!temVisibilidadeTotal`); esta task é a conferência do comportamento e o registro da regra.

## Entregáveis

1. **Conferência** de que nenhuma consulta do Auxiliar leva o filtro por `demanda_usuario` (`apenasMembro`, `apenasAtribuidas`, `validarAcessoProjeto`, `validarMembro`) e de que ele não é auto-atribuído ao criar demanda.
2. **Regra de quem é membro:** `podeSerMembroDeDemanda` (desenvolvedor e auxiliar) decide a atribuição pelo chat (`atribuir-membro.executor`, `propor-atribuir-membro.ferramenta`); gestor e administrador continuam recusados como membro.
3. **Testes** (em `demanda.service.regras.test.ts`): o Auxiliar criador não é atribuído, mas atribui quem escolher na criação; atribui e remove qualquer membro sem ser membro nem ter acesso ao projeto; conexões recusadas ao desenvolvedor.
4. **Documentação:** `SYSTEM.SPEC.md` §14 (o auxiliar, `@ExigePermissao`, regra de membro); `CONTEXT.md` e `HISTORY.md`.

## Critérios de Aceite

- Suítes do backend e integração verdes (já rodadas na 284); `npm run repo:verificar` ok.
- `SYSTEM.SPEC.md` §14 descreve o auxiliar sem contradizer a regra do gestor e do desenvolvedor.

## Fora de Escopo

- Telas (286, 287).

## Dependências

- Tasks 283 e 284.

## Riscos e Mitigação

- **"Minhas demandas" do chat e a lista de demandas para criar atividade** continuam mostrando todas as demandas em aberto ao Auxiliar (visão por tipo), não só as de que é membro. Decisão: a lista serve a criar atividade em qualquer demanda, que o Auxiliar pode.

## Resultado (2026-11-01)

Nada além do já feito na 284 precisou mudar no código; o ganho desta task é a regra escrita e coberta por teste.
