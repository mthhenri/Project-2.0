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

## Limites

- O painel do navegador do Claude tem ~500 px de largura: **1920×1080, 1366×768 e 1080×1920 não foram verificados ao vivo**, nem o tema
  claro (só o escuro). A emulação de viewport deste painel reduziu a página a um tamanho ilegível.
- Desenvolvedor sem a aba do cliente: coberto por teste de componente e de service, não ao vivo.
- Os "�" dos textos de teste vêm do payload de `curl` no Windows, não do app.
