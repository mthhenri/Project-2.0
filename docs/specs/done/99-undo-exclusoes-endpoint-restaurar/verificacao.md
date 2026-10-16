# Task 99 — verificação

Data: 2026-10-16. Backend + shared + frontend.

## O que foi feito

- **Shared**: `XRestaurarDto` (entrada) e `XRestaurad[oa]Dto` (saída) para tag, projeto, usuário, dia não útil
  (`CalendarioRestaurarDto`/`DiaNaoUtilRestauradoDto`), atividade e demanda.
- **Backend**: `PATCH /<recurso>/:id/restaurar` (`@GestorOnly`) em atividade, projeto, usuário, tag, calendário e
  demanda. Repositório: `recuperarExcluid[oa]()` (única leitura com `is_deleted = true`) e `restaurar()`
  (`UPDATE ... SET is_deleted = false, deleted_date = NULL ... AND is_deleted = true RETURNING`). Service:
  404 se não está entre as excluídas; 400 se o nome da tag, o código do projeto ou o login do usuário foram
  reutilizados por um registro ativo; 400 se a demanda da atividade, ou o projeto/pai da demanda, continua
  excluído. Sem cascata.
- **Frontend**: `DesfazerService` + `app-toast-desfazer` (toast de 6 s com "Desfazer" e "Fechar") no layout;
  `restaurar()` nos 6 services. Excluir sem `p-confirmDialog` e com remoção otimista (rollback no erro) em
  Tags, Projetos, Usuários, Calendário e Atividades; membro (inclui "Sair da demanda") e conexão removem na hora
  e desfazem por re-POST (a conexão "entrada" é recriada no sentido original). **Demanda** mantém o confirm,
  agora com texto honesto ("As sub-demandas e atividades dela deixarão de ser exibidas. Você poderá desfazer
  logo após a exclusão.") e também oferece "Desfazer".

## Verificado

- `npm test`: shared 4, backend 31 (17 novos: restaurar de tag, projeto, usuário, calendário, atividade e
  demanda — não encontrado, conflito de unicidade, dependência excluída, caminho feliz), scripts 13 (+1 skip);
  mutação (desativar a checagem do pai da demanda) foi pega por 1 teste. `npm run build` de backend e frontend
  passa (avisos de budget pré-existentes).
- API real: excluir → restaurar devolve o **mesmo id** (tag, atividade, projeto, dia não útil, usuário, demanda);
  atividade volta na listagem; restaurar de novo → 404; nome de tag/código de projeto/login reutilizados → 400
  com mensagem clara; atividade com demanda excluída → 400; demanda com projeto excluído → 400; desenvolvedor
  → 403; sem token → 401; id inexistente → 404.
- UI real (Chromium, 1920×1080 e 360×800 no toast): Tags, Projetos, Usuários, Calendário e Atividades — a linha
  sai na hora sem confirm, o toast mostra "X excluído/a — Desfazer" e **Desfazer** restaura o registro
  (`DELETE` seguido de `PATCH .../restaurar`); sem clicar, o toast some em 6 s e o registro continua excluído
  após recarregar. Conexão e membro: `DELETE` + re-`POST`. Demanda: confirm com o texto novo, toast e Desfazer
  (`DELETE /demanda/9`, `PATCH /demanda/9/restaurar`). Erro no DELETE de membro (regra "último membro")
  devolveu o membro à lista. Evidências em `.artifacts/99-undo-exclusoes-endpoint-restaurar/`.

## Defeito encontrado durante a verificação

O toast com ação feito com `p-toast key="desfazer"` não saía ao clicar em "Desfazer" (`MessageService.clear`
não removia a mensagem): trocado por um componente próprio (`app-toast-desfazer`) controlado por signal.

## Limites / pendente

- Não percorrido ao vivo: Desfazer de **usuário** com login reutilizado na UI (coberto por teste e pela API) e
  "Sair da demanda" por um desenvolvedor (mesmo caminho do membro).
- Só a última exclusão fica desfazível; uma nova exclusão dentro dos 6 s substitui a oferta anterior (o dado
  anterior continua recuperável pelo endpoint).
- Exclusões da justificativa de ponto e das anotações mantêm o confirm (fora do escopo da spec).
- O "Desfazer" da demanda restaura só a demanda (sem cascata, como a spec define).
- Sem teste automatizado do frontend (P-001); topbar a 360 px é anterior (P-002).
