# 235-plano-pontos-em-aberto.spec.md

> Task 5/7 da guarda-chuva [`chat-planejamento.spec.md`](../backlog/chat-planejamento.spec.md): painel de pontos em aberto e decisões registradas
> ao lado do documento.

## Objetivo

A IA anota livremente o que identifica no plano (pergunta, lacuna, suposição, peso demais, contradição, dependência, risco, fora do
escopo, decisão registrada), a pessoa responde no chat ou dispensa, e o que foi decidido fica registrado.

## Entregáveis

1. **Migration** (próxima livre na hora) com `tipo_plano_ponto_situacao` (`ABERTO`, `RESOLVIDO`, `DISPENSADO`, `DECISAO`; enum string
   em `shared/src/enums/`) e `plano_ponto` (`plano_id`, `rotulo` VARCHAR 60 de **texto livre**, `texto`, `situacao`, `resolucao_texto`
   anulável). `docs/SCHEMA.md` atualizado.
2. **`shared`:** DTOs de ponto (criar, resolver, dispensar com motivo opcional, `ResumoDto`).
3. **Backend:** repository, service e rotas no módulo `plano` (mesmo acesso do plano; solo e amplo valem). Ferramentas da IA para
   anotar, resolver e registrar decisão; o prompt `PLANEJAMENTO` (234) passa a orientá-las. O rótulo é livre: nada valida contra
   lista fechada.
4. **Fluxo:** responder no chat fecha o ponto (`RESOLVIDO`) e o texto entra no documento (escrita direta da 234); dispensar
   (`DISPENSADO`) pode registrar o motivo; decisão fica como `DECISAO` com a resolução.
5. **Painel** ao lado do documento no plano (`modules/chat`), com abertos primeiro e resolvidos, dispensados e decisões numa seção
   recolhível; a pessoa também cria, dispensa e reabre à mão.
6. Testes: service (transições de situação, acesso), repository com teste de integração, componente do painel.

## Critérios de Aceite

- `npm test`, `npm run test:integracao` e builds aprovados.
- Verificação ao vivo com IA real: a IA anota pontos, a resposta no chat fecha um e o texto aparece no documento; dispensar com
  motivo; decisão registrada. Em 1920×1080, 1366×768 e 1080×1920, claro e escuro, com os estados vazio, cheio e erro. Análogo: o
  documento da 233.

## Fora de Escopo

Estrutura rígida de tipos de ponto; notificação de ponto novo; pontos fora do plano; publicação (237).

## Dependências

232, 233, 234.

## Pontos em aberto (o autor confirma ao abrir a task)

- Se pontos abertos aparecem no aviso de publicar (237). Padrão proposto: sim, como lembrete, sem bloquear.

## Resultado (fechamento, 2026-10-26)

O painel ficou numa **coluna ao lado** do documento (acima das abas só em cartão estreito, menos de 44rem). A orientação das ferramentas ficou no código, não no prompt versionado. "Pontos abertos no aviso de publicar" segue para a 237.
Relato, testes e limites em `docs/context/HISTORY.md` (bloco de 2026-10-26, task 235).
