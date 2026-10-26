# Verificação — 245 Minhas demandas no chat

Verificada ao vivo em 2026-10-26, com o stack real (backend NestJS, SPA Angular e PostgreSQL 16 local, `CHAT_ARMAZENAMENTO=postgres`), Playwright
com o Chromium pré-instalado. Capturas em `.artifacts/245-chat-minhas-demandas/` (ignorada pelo Git); este texto basta para o veredito.

## Cenário

Seed de desenvolvimento (projeto DEMO, `dev.teste`) mais execuções por SQL: 5 execuções encerradas do desenvolvedor em 3 demandas (Tela de login,
Exportação em PDF, Recuperação de senha), duas atividades `DESENVOLVIDA`, e uma atividade do gestor na demanda Relatórios (com descrições técnica, do
cliente e documentação preenchidas). Depois, uma execução em andamento do desenvolvedor em Exportação em PDF.

## Resultado

| Item | Resultado |
|---|---|
| Lista à direita, desenvolvedor e gestor, 1920×1080, 1366×768 e 1080×1920, claro e escuro | Aprovada: caminho com o projeto, barra de horas, "N de M desenvolvidas"; da execução mais recente para a mais antiga; a 1080×1920 a lista passa para baixo da conversa |
| Demanda aberta (divide a tela com o divisor do planejamento), mesmos tamanhos e temas | Aprovada: Checklist abre primeiro, desenvolvidas riscadas e na frente, a que roda destacada com "Rodando", as em aberto depois |
| Abas do desenvolvedor | Checklist, Técnica e Documentação (sem Cliente), nos três tamanhos |
| Abas do gestor | Checklist, Técnica, Cliente e Documentação; a aba Cliente mostra o texto do cliente |
| Estados vazio e erro da lista (rota interceptada), claro e escuro | Aprovados: vazio com texto explicativo; erro com "Tentar de novo" |
| Execução rodando | A demanda dela abre sozinha nos três tamanhos e temas; "Demandas" volta à lista, que **não** reabre a demanda; abrir outra demanda com a execução rodando funciona |
| Histórico | Não aparece mais à direita (já está no seletor do topo) |

## Limites e achados

- **Barra de horas:** a demanda aberta soma as atividades da demanda (execuções encerradas); a lista conta a execução em andamento até agora. Com uma
  execução rodando, os dois números diferem pelo tempo da execução aberta (observado: lista com 5 min a mais).
- **Reaproveitamento (entregável 5):** não reaproveitou `app-demanda-aberta` (task 239): ela é tela de edição (título, status, membros, tags,
  atividades e conexões editáveis, diálogos) e pô-la em modo leitura exigiria desligar quase tudo e mexer num componente compartilhado. O chat monta o
  mesmo desenho com os componentes pequenos que servem (barra de horas, bolinha de status, visualizador de Markdown, abas).
- **Orçamento de estilo:** `chat.page.scss` está em 8,00 kB, o limite do build. A próxima mudança nele exige extrair o layout dividido para um arquivo
  próprio.
- O contexto do chat mostrou "Configuração da IA inválida" (sem chave no ambiente): é o estado esperado sem provedor e não afeta a lateral.
- Não verificado: Project Desktop e o popup do chat (`chat-popup`), que não usam esta lateral.
