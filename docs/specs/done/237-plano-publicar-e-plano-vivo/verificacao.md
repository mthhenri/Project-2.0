# Verificação ao vivo — task 237 (publicar o plano e plano vivo)

Data: 2026-10-26. App real (backend em watch e frontend em `:4200`, banco `project20`), gestor no navegador do Claude e `dev.teste`
(desenvolvedor, não membro da demanda) pela API. Dados de teste desfeitos ao fim (plano e demanda criados foram excluídos; os textos
publicados, limpos; a data de publicação do plano 8 ficou).

## O que foi visto

- **Publicar em demanda vazia:** o diálogo mostra "Texto novo" e o diff todo em verde para Descrição técnica e Documentação; a do
  cliente aparece para o gestor. Publicar gravou os dois textos na demanda e marcou `publicacao_data`; o cabeçalho passou a mostrar
  "Publicado 26/10 08:21".
- **Segunda publicação:** com o plano alterado depois, o diálogo marca só a aba que mudou ("Muda") e o diff por palavra mostra
  `15 → 30`; as outras ficam "Sem mudança" e desabilitadas.
- **Permissão:** `dev.teste`, não membro da demanda, recebeu "Você só pode editar demandas das quais é membro" ao publicar (a gravação
  passa pela `DemandaService`).
- **Nasceu do plano:** o chip aparece no detalhe da demanda aberta da Árvore e, ao clicar, abre `/chat?plano=<id>` no plano. Com o plano
  marcado como solo, o desenvolvedor recebe `null` (não vê); o criador continua vendo.
- **Criar demanda a partir do plano:** o botão abre o formulário de criação de sempre com o título do plano em "Nome"; ao criar, o plano
  ficou ligado à demanda nova.

## Segunda rodada (Playwright, gestor/administrador, app real)

Plano ligado a "Recuperação de senha" com três textos diferentes dos da demanda e um ponto em aberto; capturas em `.artifacts/237/` (local).
**1920×1080, 1366×768 e 1080×1920, nos temas escuro e claro**: a tela do plano e o diálogo de publicação (lembrete do ponto em aberto, as
três abas com diff por palavra, "Muda" e "Texto novo") sem rolagem horizontal e sem sobreposição; no 1080×1920 o diálogo cabe inteiro. O
chip "Nasceu do plano" foi visto no detalhe da demanda aberta em 1366×768, claro e escuro. Plano e textos de teste desfeitos ao fim.

## Limites

- Desenvolvedor sem a aba do cliente: coberto por teste de componente e de service, não ao vivo.
- Anexar/estados de erro do diálogo (409, falha ao ler a demanda): só por teste de componente.
- Os "�" dos textos da primeira rodada vêm do payload de `curl` no Windows, não do app.
