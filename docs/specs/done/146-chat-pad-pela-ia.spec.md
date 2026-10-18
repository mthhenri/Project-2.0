# Task 146 — Chat: pad pela IA

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 8. Fluxo do desenvolvedor, item 10; seção "Pad estruturado" (edição pontual).

## Objetivo

Fazer a IA ler o pad por seção e propor anotações pontuais (nunca reescrevendo tudo), e deixar o pad do desenvolvedor só para leitura enquanto a IA está no ar.

## Entregáveis

1. Ferramenta de leitura `consultar_pad` (carrega só as seções pedidas, para economizar tokens; "Feito" só o título do dia) e ferramenta de proposta `propor_anotar_pad` (seção, trecho a trocar ou a acrescentar, novo texto).
2. Executor `ANOTAR_PAD`: edição **pontual** dentro da seção pelo service do pad (task 125), com a conferência de `updated_date` (conflito vira erro claro) e desfazer que restaura o texto anterior se a seção ainda estiver como a IA deixou. Em **Pessoal** só com pedido explícito do usuário e nunca reorganiza nem remove sozinha.
3. Prompt `PAD` (nível padrão) e instruções no `CONVERSA`: o que vai em cada seção, título por dia em Feito, anotar o que foi feito a cada execução encerrada.
4. Frontend: com a IA **no ar**, a tela do pad é só leitura (cinco seções renderizadas em Markdown, sem acordeões editáveis nem "Enviar para"); com a IA **desligada ou fora do ar**, edita como hoje (task 126). Confirmar o que a 126 já faz antes de mexer.
5. Testes: edição pontual, conflito, desfazer inseguro, Pessoal só com pedido.

## Critérios de Aceite

- Na aplicação real: "anota que a homologação reinicia às 18h" propõe o trecho em Lembretes, o cartão mostra o antes e o depois, confirmar grava e desfazer volta.
- Com a IA no ar o pad não tem edição manual; desligada pela tela de Configurações, volta a editar.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Ler o pad de outro usuário (gestor "equipe", task 153, se vier a precisar).
- Conversão ou reorganização automática do pad.

## Dependências

`125` a `128` (pad estruturado), `136`/`137` (propostas e ferramentas) e `139` (tela do chat).
