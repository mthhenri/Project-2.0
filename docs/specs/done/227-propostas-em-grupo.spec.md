# 227-propostas-em-grupo.spec.md

> Task 4/8 (fase 4) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): várias propostas da mesma resposta viram um grupo
> com Confirmar todas, Recusar todas e Desfazer todas. Origem: `IDEAS.md` I-026 (decisão 5 da guarda-chuva).

## Objetivo

Quando a IA propõe várias coisas numa resposta só, o usuário vê **um grupo** no fim da resposta e resolve tudo de uma vez ou linha por
linha, sem confirmar uma a uma.

## Entregáveis

1. **Grupo no fim da resposta** na `chat.page` (componente novo ao lado do `proposta-cartao`): cabeçalho com **Confirmar todas** e
   **Recusar todas**; cada linha numerada, que abre os detalhes, pode ser ajustada ou tirada do grupo e mostra "depende da N" quando
   depende de outra.
2. **Confirmar todas numa chamada só ao backend**, na ordem do grupo (rota nova no controller de `proposta-ia`, controller fino; DTOs
   no `shared` conforme a skill `project20-dto-conventions`, entrada no infinitivo e saída no particípio). Cada proposta segue atômica e
   com o próprio desfazer. Se uma falhar, as que dependem dela ficam **pendentes com o motivo na linha**; as independentes seguem.
   **Recusar todas** e **Desfazer todas** (ordem inversa, para na primeira que recusar) no mesmo desenho.
3. **Dependência entre propostas** (regra pura, com teste): como o grupo sabe que a N depende da M (por exemplo, atividade criada numa
   demanda que a proposta anterior cria). O critério exato é **ponto em aberto**: levantar no código dos executores quais referências
   entre propostas já existem (`backend/src/modules/proposta-ia/domain/proposta-referenciada.ts`) e propor ao autor.
4. Depois de resolvido: "N feitas · Ver · Desfazer todas". Quando o grupo mistura níveis de autonomia (228), o que já foi feito aparece
   numa linha azul em cima e o resto em "N esperando você"; **esta task deixa o ponto de encaixe e a 228 liga**.
5. Mensagem com uma proposta só continua sendo o cartão (226), sem grupo.

## Critérios de Aceite

- Testes do `PropostaIaService` (confirmar todas na ordem, parada nas dependentes de uma que falhou, recusar e desfazer todas), do
  controller e de integração do repository se houver consulta nova (`npm run test:integracao`).
- Spec de componente do grupo: confirmar todas, falha no meio com motivo na linha, tirar do grupo, ajustar, recusar, desfazer todas.
- Verificação ao vivo com resposta de duas e de cinco propostas, em 1920×1080, 1366×768 e 1080×1920, tema claro e escuro; análogo: o
  `proposta-cartao` e a tela do chat; estados: pendente, parcial, tudo feito, falha, expirado.
- Builds e testes de `shared`, `backend` e `frontend` sem regressão; `docs/SYSTEM.SPEC.md` (linha `proposta-ia`) atualizado.

## Fora de Escopo

- Autonomia por tipo e a linha azul funcionando (228); propostas novas (229 a 231).
- Confirmar propostas de respostas diferentes num grupo só: o grupo é por resposta.

## Dependências

225 (a mensagem guarda a lista de propostas) e 226 (linha compacta e linha de feito).

## Riscos e Mitigação

- Confirmar em lote executa várias ações de uma vez. Mitigação: cada proposta mantém a confirmação atômica e o desfazer próprio; só o dono
  confirma; nada roda sem o clique do usuário nesta task.
