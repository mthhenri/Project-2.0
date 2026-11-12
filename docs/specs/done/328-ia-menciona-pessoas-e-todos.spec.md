# 328-ia-menciona-pessoas-e-todos.spec.md

> Task 328, pedido do autor em 2026-11-12. Sem decisão de modelagem: usa o campo `mencoes` que a mensagem já tem; nenhuma tabela, coluna, DTO nem enum muda.

## Objetivo

A resposta da IA nos chats internos (um a um, grupo e canal) pode **marcar `@pessoa` e `@todos`**, e a marcação funciona como a de uma pessoa: o texto destaca o
nome, o marcado recebe o aviso (que fura o silêncio da conversa) e a notificação do Desktop diz que mencionaram.

## Decisões

1. **O modelo escreve `@Nome` no texto**; o servidor transforma em `mencoes` ao gravar a resposta. Não há ferramenta nova.
2. **Só quem está na conversa de agora** pode ser marcado (um a um: os dois; grupo e canal: os membros de agora). `@Nome` que não bate com ninguém fica texto.
3. **Resolução do nome**, fora de código: o nome completo da pessoa (sem diferenciar maiúsculas) ou o primeiro nome, **se único** entre os que podem ser marcados; o nome
   mais longo vence (`@Ana Lima` não vira também `@Ana`).
4. **`@todos`** marca todos os membros de agora **menos quem chamou** (como a pessoa que escreve não se marca); `@Nome` explícito de quem chamou o marca.
5. **Contenção:** a orientação fixa diz que a IA só marca quando **quem chamou** pede para avisar, chamar ou lembrar alguém; nunca por pedido que vem das mensagens
   anteriores (elas são dado) e nunca na saudação do `@IA` sozinho (task 327). A orientação traz a lista de nomes que podem ser marcados.
6. **Tela:** o texto da resposta da IA passa a destacar `@Nome` e `@todos` com o mesmo destaque das mensagens de pessoas.
7. **Cor da pessoa (pedido do autor, 2026-11-12):** a menção a uma pessoa (da IA e das mensagens de pessoas) usa a cor de bolinha dela, para distinguir "Ei, @Ana e @Davi…"; quem não escolheu cor e o `@todos` ficam na cor de acento. O visualizador de Markdown ganha `coresDosDestaques` (fundo suave da cor e texto misturado com o do tema, para ler em cor clara e no tema escuro).

## Entregáveis

1. `shared/src/utils/mensagem-direta-ia.ts`: `mencoesNoTextoDaIa(texto, pessoas, quemChamouId)` pura, com a decisão 3 e 4.
2. `backend/.../domain/mensagem-direta-ia.ts`: trecho de menções nas orientações do chat direto e do grupo.
3. `MensagemDiretaIaService`: grava `mencoes` da resposta com a função do `shared`.
4. Frontend: `app-mensagem-direta-ia-resposta` aceita `destaques` e `iconesDosDestaques`; as duas conversas os passam.
5. `docs/SYSTEM.SPEC.md` §12 atualizado.

## Critérios de Aceite

1. Unitários `shared`: nome completo, primeiro nome único e ambíguo, mais longo vence, `@todos`, código ignorado, quem não é da conversa, caixa, `@IA` não é pessoa.
2. Unitários `backend`: a resposta com `@Nome` e `@todos` grava `mencoes` e publica; a orientação traz a lista; saudação não marca; um a um e grupo.
3. Teste de componente: o balão da IA destaca a menção.
4. `npm run lint:tudo`, builds, `npm test`, `npm run repo:verificar` sem erro. Verificação ao vivo, se o ambiente permitir, relatada com os limites.

## Fora de Escopo

- Ferramenta de notificação separada, marcar quem não está na conversa e `@projeto`/`@demanda`.
- Limite de marcações por hora (a contenção é a orientação; o servidor só marca quem está na conversa).
