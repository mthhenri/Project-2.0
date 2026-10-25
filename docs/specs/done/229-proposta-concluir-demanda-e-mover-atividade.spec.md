# 229-proposta-concluir-demanda-e-mover-atividade.spec.md

> Task 6/8 (fase 6) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): duas propostas novas, **concluir demanda** e
> **mover atividade para outra demanda** (decisão 6). Origem: `IDEAS.md` I-026.

## Objetivo

A IA passa a propor concluir uma demanda e mover uma atividade de uma demanda para outra, sempre com confirmação (nível Pergunta) e com
desfazer pelo prazo de 30 min.

## Entregáveis

1. **Dois tipos novos** em `TipoPropostaIaEnum` (`shared/src/enums/tipo-proposta-ia.enum.ts`, valores `CONCLUIR_DEMANDA` e
   `MOVER_ATIVIDADE`), com a linha na tabela `tipo_proposta_ia` (migration na próxima livre na hora), DTOs dos dados no `shared`
   (`project20-dto-conventions`) e validação em `backend/src/modules/proposta-ia/domain/validar-dados-da-proposta.ts`.
2. **Concluir demanda**: ferramenta de proposta (`propor_concluir_demanda`) e executor, que chama `DemandaService.alterar` com
   `status: CONCLUIDA` (`TipoDemandaStatusEnum`) com o token de quem confirma. Quem pode: quem é da demanda e o gestor (as mesmas regras de
   hoje; nenhuma regra nova). O cartão **avisa das atividades abertas** e oferece a escolha "Só a demanda". O que acontece com as
   atividades abertas quando a escolha não é "Só a demanda" é **ponto em aberto**: confirmar com o autor se a IA só avisa (padrão
   proposto) ou se há ação sobre elas. Desfazer volta o status anterior, só se a demanda ainda está como a proposta deixou.
3. **Mover atividade**: ferramenta (`propor_mover_atividade`) e executor. Quem pode: dono da atividade e o gestor. O cartão mostra **de
   onde para onde** e que as **execuções vão junto**. Hoje `AtividadeAlterarDto` não tem `demandaId`: a mudança de demanda é **operação
   nova na `AtividadeService`** (e no repository, SQL puro), com a validação de que o usuário pode criar atividades na demanda de
   destino, que ela não esteja concluída/cancelada e que o dono ainda tenha acesso (**ponto em aberto**: confirmar essas validações com o
   autor ao abrir a task). Desfazer devolve à demanda de origem, só se a atividade ainda está na de destino.
4. **Nível**: ambas `PERGUNTA` na regra do `shared` da 228 (a tabela "Nível por tipo": "concluir demanda, mover e excluir atividade").
5. Cartões (`proposta-cartao`) e o rótulo de cada tipo no chat; `docs/SYSTEM.SPEC.md` (linhas `proposta-ia` e `ferramenta-ia`) e
   `docs/SCHEMA.md` atualizados.

## Critérios de Aceite

- Testes: executores (confirmar, estado mudado no desfazer, sem permissão), `AtividadeService` (mover: dono, gestor, não dono, demanda de
  destino inválida), ferramentas (permissão por tipo de usuário); repository novo ou alterado com `npm run test:integracao`.
- Builds de `shared`, `backend` e `frontend` passam; migration aplica e reverte.
- Verificação ao vivo: desenvolvedor e gestor propondo, confirmando e desfazendo cada uma; cartão com atividades abertas; 1920×1080,
  1366×768 e 1080×1920, tema claro e escuro; análogo: `proposta-cartao` dos tipos existentes.

## Fora de Escopo

- Mover demanda de lugar na árvore; concluir projeto; mover várias atividades de uma vez.
- Mudar quem pode fazer o quê no sistema.

## Dependências

Nenhuma obrigatória para o código; para o cartão sair no desenho final, 224 e 226, e a 228 para o nível. Aplicar `gerenciamento-de-impacto`
em `TipoPropostaIaEnum`, `AtividadeService` e `proposta-cartao`.
