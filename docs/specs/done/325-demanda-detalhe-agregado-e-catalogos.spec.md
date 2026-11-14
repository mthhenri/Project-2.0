# 325-demanda-detalhe-agregado-e-catalogos.spec.md

> Task solta. Origem: `PROBLEMS.md` P-080 (DOSSIE R-02, R-08, R-11, R-12). Decisão do autor (2026-11-11): endpoint de detalhe agregado mais catálogos em memória.

## Objetivo

Abrir `/demanda` e selecionar uma demanda faz poucas requisições, sem refazer o que a tela já tem.

## Entregáveis

1. **Contrato (aprovado pelo autor em 2026-11-11, com a condição de não trazer dado à toa e manter a segurança):** `GET /demanda/:id/detalhe` devolve `DemandaDetalheRecuperadoDto` = `{ demanda: DemandaRecuperadaDto, ancestrais, tags, membros, conexoes }`, exatamente os mesmos blocos das cinco rotas avulsas, sem campo novo (entrada `DemandaDetalheRecuperarDto`). Árvore (filhas), plano de origem e atividades ficam nas rotas dos próprios módulos. **Feito.**
2. Service `recuperarDetalhe`: confere o acesso **uma vez**, pela mesma regra de `recuperar` (desenvolvedor só vê demanda de projeto a que tem acesso; sem acesso, "não encontrada"), e só então lê ancestrais, tags, membros e conexões em paralelo. **Feito.**
3. Frontend: `carregarTudo` (`demanda-detalhe.base.ts`) usa o detalhe agregado no lugar das cinco chamadas avulsas: a seleção de uma demanda cai de 8 para 4 requisições (detalhe, árvore, plano de origem e atividades). **Feito.**
4. Catálogos em memória (`/tag` e a lista de usuários não pedidos de novo ao voltar à Árvore, trocar de projeto ou abrir a edição) e a edição que refaz leituras que a tela já tem. **Feito** (desenho aprovado pelo autor ao pedir os pontos em aberto, em 2026-11-11): validade de 60 s mais invalidação pelas gravações do próprio cliente; mudança de outra pessoa chega ao fim do prazo. A parte "a edição que refaz leituras que a tela já tem" ficou como está, de propósito (ver o relatório).
5. Testes: service (um bloco, acesso conferido uma vez, restrição do desenvolvedor, nada lido de apoio sem acesso), controller (rota e ordem), `DemandaService` do frontend e `demanda-aberta` (não usa mais as cinco rotas avulsas). **Feito.**

## Critérios de Aceite

- Abrir `/demanda` e clicar numa demanda: contagem de requisições medida ao vivo antes e depois, registrada no relatório (meta: selecionar uma demanda < 8; medido ao vivo: 4).
- Permissão preservada: desenvolvedor fora da demanda recebe 403/404; relatório da varredura de leitura do dossiê repetida para a rota nova.
- `npm run test:integracao`, testes, build e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

P-084, P-085, outras telas, mudança de tabela ou migration.

## Dependências

Aprovação do autor do DTO (dada em 2026-11-11). Skill `gerenciamento-de-impacto` sobre `DemandaService` e DTOs de demanda.

## Fecho

Concluída em 2026-11-11. Detalhe agregado (`GET /demanda/:id/detalhe`), com acesso conferido uma vez e permissão igual à rota avulsa (200/404/401 conferidos ao vivo); seleção de demanda com 4 requisições. Item 4: `CatalogoEmMemoria` (60 s, invalidado pelas gravações do próprio cliente, só sucesso, por pessoa logada) nas tags e em todos os usuários; voltar à Árvore passou de 7 para 5 leituras e abrir a edição de 6 para 4. A edição continua lendo a demanda, as tags e os membros de propósito (ver o relatório). Relatório: [`verificacao-320-325.md`](../backlog/auditoria-requisicoes-telas/verificacao-320-325.md). Gates: frontend 2700 testes, backend 1733, shared 342, integração 425, `npm run lint:tudo` sem erro.
