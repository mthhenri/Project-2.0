# 223-barra-lateral-em-grupos.spec.md

> Conversa com o autor em 2026-10-25 (ideia I-027). Mockup aprovado no canvas privado do autor:
> https://claude.ai/artifact/TTg49kss7oQH5e1xMJHhdV (quatro barras lado a lado: desenvolvedor, gestor, administrador e recolhida).
> **Não foi implementada.**

## Objetivo

A barra lateral já tem onze itens numa lista só. Os itens passam a ser organizados em **grupos de itens parecidos**, separados por um
título discreto, para que cada pessoa ache o que procura mais rápido.

## Decisões do autor

1. **Os grupos são os mesmos para todos os perfis.** Cada perfil vê só os itens que já pode abrir hoje (as regras de visibilidade de
   `ITENS_NAVEGACAO` não mudam), e **um grupo sem nenhum item visível não aparece**.
2. **Grupos e ordem:**

   | Grupo | Itens, nesta ordem | Quem vê |
   |---|---|---|
   | **Dia a dia** | Chat, Atividades, Execuções, Ponto | todos |
   | **Projetos** | Projetos, Demandas | Projetos: gestor e administrador; Demandas: todos |
   | **Gestão** | Calendário, Tags, Usuários | gestor e administrador |
   | **IA** | IA Config., Supervisão do chat | IA Config.: administrador; Supervisão do chat: gestor e administrador (entra com a task 214) |

3. **Modelagem fica fora dos grupos**, sozinha no fundo da barra, para todos: entre o último grupo e o botão "Recolher", com um espaço a
   mais acima dela e sem título. Não é tela do dia a dia e não deve ser clicada sem querer.
4. **O item "IA" passa a se chamar "IA Config."**, mesmo redundante com o nome do grupo, para não mudar demais o que as pessoas já se
   acostumaram a procurar. Rota, ícone e atalho continuam os mesmos.
5. **Separador sem moldura:** um título pequeno em cinza, em maiúsculas, com uma linha cinza fina logo abaixo. Nada contorna o grupo.
6. **Barra recolhida:** o título some e fica só a linha entre os grupos.
7. Os **atalhos de teclado** (`g` + letra) não mudam.

## Desenho proposto (confirmar na implementação)

- `ItemNavegacao` (`frontend/src/app/shared/layout/navegacao.ts`) ganha o grupo do item (Modelagem sem grupo, no fundo), e a ordem de
  `ITENS_NAVEGACAO` segue a tabela acima. O agrupamento e o descarte de grupo vazio ficam numa função pura testada (Vitest, `*.test.ts`).
- O `sidebar.component` desenha os grupos com o separador e a Modelagem no fundo; o estado de tela substituída pelo chat
  (`desabilitado`) e o selo de IA desligada continuam como hoje.
- O item **Supervisão do chat** não é criado aqui: a task 214 o acrescenta no grupo IA. Enquanto ela não existir, o gestor (que não é
  administrador) não vê o grupo IA.
- Antes de alterar `navegacao.ts`, aplicar a skill `gerenciamento-de-impacto` (`npm run impacto`): a lista também alimenta os atalhos.
- Análogo de UI: a própria barra lateral atual (densidade, item ativo, recolhida, tema escuro).

## Fora de Escopo

- Mudar regra de visibilidade de qualquer item; criar telas novas; grupos recolhíveis ou reordenáveis pelo usuário.

## Critérios de Aceite

- Teste da função de agrupamento: ordem, grupo vazio descartado, Modelagem fora dos grupos, para os três perfis.
- Teste de componente da barra: títulos dos grupos, recolhida só com a linha, Modelagem no fundo, rótulo "IA Config.".
- Verificação ao vivo com desenvolvedor, gestor e administrador, expandida e recolhida, temas claro e escuro, em 1920×1080, 1366×768 e
  1080×1920, comparando com a barra atual.
