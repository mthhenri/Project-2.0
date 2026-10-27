# Verificação — 243 Bom dia "continuar ou coisa nova"

Verificada em 2026-10-26 com o stack real e IA da Anthropic, como o desenvolvedor `dev.teste` (projeto Demo). Saídas em
`.artifacts/243-chat-bom-dia-continuar-ou-coisa-nova/` (ignorada pelo Git).

## Gates automáticos

Os mesmos da 242: `shared` 275, backend 1513, integração 350, frontend 2213, builds e `repo:verificar` aprovados. Sem lint (P-001).

## Teste de prompt (`POST /prompt/CONVERSA/testar`, nível RAPIDO, só texto)

| Caso | Resultado |
|---|---|
| Abertura do dia | Aprovado: cumprimenta, diz onde parou ("Services e controllers") e termina perguntando se continua ou tem coisa nova |
| "Continuar" | Aprovado: segue na atividade que roda, sem mudar nada |
| Coisa nova com a demanda Suporte existente | Aprovado: encaixa em Suporte, propõe criar a atividade com o caso no nome, pausar a que roda e iniciar |
| Coisa nova sem a demanda Suporte | Aprovado: não cria a demanda; pergunta onde ela deve ficar e oferece uma atividade na demanda existente |

## Ao vivo no chat

- **Abertura do dia** (1920×1080): apresenta as atividades em aberto por prioridade, diz que não há execução e termina com "continuar com alguma dessas atividades ou tem coisa nova?".
- **Coisa nova sem a demanda de Suporte:** a IA perguntou onde criar. Pedido "na raiz" → recusou, porque o desenvolvedor só cria demanda dentro de demanda de estrutura, e ofereceu Autenticação e Relatórios. Com "Em Autenticação" mostrou o cartão **Criar demanda** (Suporte, dentro de Autenticação) e **esperou a confirmação**. Confirmado o cartão, **criou a atividade** "investigar CPF válido recusado, caso 4821" (identificador no nome, urgente) e **iniciou a execução**, pausando a anterior, em "faz e avisa" com Desfazer. Banco: uma única execução ativa.
- **Desfazer:** "Desfazer todas" do grupo, depois de a execução ter sido encerrada pelo check-in, foi **recusado** com "A execução já foi encerrada: não dá para desfazer o início"; nada mudou no banco.
- **Tamanhos:** 1920×1080, 1366×768 e 1080×1920 (a lista de demandas vai para baixo da conversa nos estreitos) sem sobreposição nem corte visível.

## Limites e achados

- Estados não percorridos: "sem atividade anterior" e "com a última atividade já DESENVOLVIDA"; "com execução rodando" foi coberto no caso da demanda criada.
- Tema escuro não foi percorrido (a task não muda UI).
- O aviso do início da conversa saiu estranho uma vez ("já que é um bom dia, o cumprimento de antes ficou fora do lugar"), porque a abertura disse "Boa noite" às 22:26 e o usuário escreveu "Bom dia". Ruído do modelo, sem efeito nas ações.
