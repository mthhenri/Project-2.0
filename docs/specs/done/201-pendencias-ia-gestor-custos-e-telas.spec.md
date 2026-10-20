# 201-pendencias-ia-gestor-custos-e-telas.spec.md

> Task solta, pedido do autor (2026-10-20), cinco pendências numa mensagem. Escrita junto da entrega (as decisões marcadas "minha" são a confirmar).

## Objetivo

1. A IA do gestor lê as conversas dos desenvolvedores.
2. Esqueletos de carregamento que se parecem com a tela que vai aparecer.
3. Telas de Ponto e Execuções sem quebra visual com o horário (cronômetro) correndo.
4. Aba **Custos** no menu da IA (Configurações da IA).
5. Aceitar uma proposta e salvar o pad não travam a tela toda.

## Decisões

- **1 — ferramentas, não tela.** Três ferramentas de leitura só do gestor e do administrador (`listar_conversas_do_desenvolvedor`, `consultar_conversa_do_desenvolvedor`,
  `buscar_nas_conversas_do_desenvolvedor`). Só conversa de **desenvolvedor** (nunca de outro gestor ou administrador, como no pad, task 195) e só o contexto `CHAT`
  (o check-in e os avisos de falha ficam de fora). A IA vê autor, texto (cortado em 1500 caracteres) e hora; nunca tokens, modelo nem conteúdo bruto. Limites: 30 conversas,
  60 mensagens (as mais recentes) e 20 achados por chamada. **Decisão minha:** o desenvolvedor não é avisado de que o gestor consultou; a spec do chat não pede isso.
- **4 — o custo se mede por chamada, não pelo histórico do chat.** O chat só guarda tokens das mensagens do próprio chat (em três armazenamentos diferentes); assistente de
  descrição, relatório, nomeação e sugestões não deixam rastro. Por isso cada chamada bem-sucedida grava uma linha em `ia_uso` no ponto único `IaService.executar`
  (a mesma coleta da task 188). **Decisão minha:** o preço fica em `ia_modelo_preco` (dólar por milhão de tokens), editável pelo administrador na própria aba, e o custo
  é calculado na consulta: preço de modelo muda e não deve ser constante no código. Modelo sem preço fica fora da soma e é avisado. O custo só existe do deploy em diante.
- **5 — causa e correção.** Toda mutação sem `comFeedbackProprio()` liga o overlay global. As rotas de proposta (confirmar, ajustar, recusar, desfazer) e do pad
  (`PUT /anotacao`, mover trecho) só marcavam o erro como tratado pela tela, e o espalhamento `{ ...comFeedbackProprio(), ...comErroTratadoPelaTela() }` **substitui** o
  contexto do primeiro pelo do segundo (a chamada de download do desktop tinha esse defeito escondido). Novo `comFeedbackProprioEErroTratado()` junta os dois no mesmo contexto.
- **2 e 3 — o que foi achado.** Ver `201-pendencias-ia-gestor-custos-e-telas/verificacao.md`.

## Entregáveis

1. `shared`: DTOs das três ferramentas (`dtos/ferramenta-ia/`) e `dtos/ia-custo/`.
2. Backend: `ChatDesenvolvedorService` e as três ferramentas no `ChatModule`; módulo `ia-custo` (repository, service, controller `GET /ia-custo` e `PUT /ia-custo/preco`,
   só administrador); `IaService` grava o uso; migration `0047` (`ia_uso`, `ia_modelo_preco`).
3. Frontend: aba "Custos" (`app-custos-aba`, lazy) com recorte mensal/anual, totais, gráfico de custo por dia/mês e tabela por modelo com o preço editável;
   `app-skeleton-lista` aceita `cabecalhos`, `larguras`, `alturaLinha`, `larguraMinima` e `alturaCartao`, usados em Usuários, Atividades, Execuções, Calendário, Ponto, Projetos e Tags;
   grade compartilhada no card de Ponto da equipe e `app-execucao-timer` alinhado ao centro da linha.
4. Testes: unitários do backend (serviço, ferramentas, cálculo de custo, `IaService`), integração do repository de custo e testes do frontend (aba, utilitários, esqueleto, serviços).

## Fora do escopo

Nada de tela para o gestor ler conversas de desenvolvedores (só a IA); custo por usuário ou por origem da chamada; histórico de preço (trocar o preço recalcula o passado);
exportar o custo.
