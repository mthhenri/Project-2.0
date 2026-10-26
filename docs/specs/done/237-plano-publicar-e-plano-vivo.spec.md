# 237-plano-publicar-e-plano-vivo.spec.md

> Task 7/7 da guarda-chuva [`chat-planejamento.spec.md`](chat-planejamento.spec.md): publicar o plano na demanda, manter o plano vivo e
> mostrar "nasceu do plano" no detalhe da demanda.

## Objetivo

A pessoa **publica** os textos escolhidos do plano na demanda ligada, vendo o diff contra o texto atual. O plano segue editável e a
demanda mostra de que plano nasceu.

## Entregáveis

1. **Publicar (backend):** operação no módulo `plano` que grava os textos escolhidos pela `DemandaService` (valem as permissões de
   edição de demanda de hoje: membro da demanda ligada, gestor e administrador) e marca `plano_demanda.publicacao_data`. Alteração de
   trecho pendente (234) fica de fora, com aviso. Descrição do cliente só é publicada por gestor ou administrador. Texto vazio no
   plano não apaga o da demanda sem escolha explícita.
2. **Publicar (tela):** diálogo na tela do plano (233) para escolher os textos, ver o **diff contra o texto atual da demanda** (por
   palavra da 224 se já estiver em `done/`; senão o diff atual) e confirmar; mostra pontos ainda abertos (235) como lembrete.
3. **Plano vivo:** depois de publicar, o plano segue editável; a próxima publicação compara de novo com o texto atual da demanda.
4. **Criar demanda a partir do plano:** a pessoa cria **uma** demanda nova ligada ao plano, pelas regras de criação de hoje
   (desenvolvedor só cria sub-demanda), reaproveitando o fluxo de criação existente.
5. **"Nasceu do plano" no detalhe da demanda** (`modules/demanda/components/demanda-detalhe-dialog`): mostra o plano de origem com
   link, só para quem pode vê-lo (plano solo ou amplo alheio não aparece). DTO de leitura no `shared`; consulta via `plano_demanda`.
6. Testes: service (permissões, descrição do cliente, pendência de trecho, marcação de data), repository com integração, componente
   do diálogo e do detalhe da demanda.

## Critérios de Aceite

- `npm test`, `npm run test:integracao` e builds aprovados.
- Verificação ao vivo: publicar com diff em demanda vazia e com texto; desenvolvedor sem a aba do cliente; segunda publicação
  mostrando só o que mudou; "nasceu do plano" no detalhe, com e sem permissão de ver o plano. Em 1920×1080, 1366×768 e 1080×1920,
  claro e escuro. Análogos: o diálogo de detalhe da demanda e o `proposta-cartao`.

## Fora de Escopo

Plano que vira várias demandas; documentação a partir do que foi feito; integração com Git; notificação de publicação.

## Dependências

232, 233, 234; 235 e 236 desejáveis (o lembrete de pontos abertos usa a 235). 224 para o diff por palavra (sem ela, usa o diff atual).

## Riscos e Mitigação

A gravação passa **sempre** pela `DemandaService`; o módulo `plano` não grava nas colunas da demanda. Aplicar
`gerenciamento-de-impacto` no detalhe da demanda (componente compartilhado).
