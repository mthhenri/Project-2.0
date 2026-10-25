# 230-proposta-desconectar-demandas-e-excluir-atividade.spec.md

> Task 7/8 (fase 6) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): **desconectar demandas** e **excluir atividade
> sem execução** (decisão 6), com a exceção aprovada pelo autor em 2026-10-25 ao "sem exclusão" do registro de ferramentas.

## Objetivo

A IA passa a propor remover uma conexão do grafo de demandas e excluir uma atividade que nunca teve execução, e **só esses dois casos**:
qualquer outra exclusão continua proibida a ela.

## Entregáveis

1. **Dois tipos novos** em `TipoPropostaIaEnum` (`DESCONECTAR_DEMANDA` e `EXCLUIR_ATIVIDADE`), com linha em `tipo_proposta_ia`
   (migration na próxima livre na hora), DTOs no `shared` e validação em `validar-dados-da-proposta.ts`.
2. **Desconectar demandas** (só gestor, nível `FAZ_E_AVISA` pela tabela da 228): ferramenta e executor em `backend/src/modules/demanda/executores/`
   (ao lado de `conectar-demanda.executor.ts`), chamando `DemandaService.excluirConexao` com o token; as demandas não mudam de lugar.
   Desfazer recria a conexão por `criarConexao` (com a validação de ciclo por CTE recursiva), só se ainda não existe outra e não forma ciclo.
   A regra "só gestor" descendo para `criarConexao`/`excluirConexao` é entregável da 228; **se a 228 ainda não estiver feita, esta task a
   faz** (service recebe o usuário, teste de gestor sim / desenvolvedor não).
3. **Excluir atividade sem execução** (dono da atividade e gestor, nível `PERGUNTA`): ferramenta e executor chamando
   `AtividadeService.excluir` (soft delete). **Com execução, a IA não oferece e explica que é pela tela**: a ferramenta recusa com o
   motivo, que o modelo repassa ao usuário. Desfazer usa `AtividadeService.restaurar`, só se a atividade continua excluída e sem execução
   nova.
4. **Exceção nomeada ao "sem exclusão"** em `backend/src/modules/ferramenta-ia/services/ferramenta-ia.registro.ts`: hoje o registro
   recusa nome que sugira excluir, apagar, remover, deletar, eliminar ou descartar. Abre-se exceção nomeada **só** para as duas ferramentas
   deste task (lista fixa de nomes permitidos, no código e no teste); qualquer outro nome desses continua recusado. Teste: as duas
   passam, uma terceira com "excluir" no nome é recusada. Exclusão continua soft delete.
5. Atualizar `docs/SYSTEM.SPEC.md` (linha `ferramenta-ia`, "Sem exclusão", e `proposta-ia`) na mesma task, e o comentário do enum
   ("Nenhuma exclui dados").
6. Cartões no `proposta-cartao` (de qual demanda para qual, ou qual atividade e que ela não tem execuções).

## Critérios de Aceite

- Testes: registro (exceção só para as duas), executores (confirmar, desfazer, estado mudado), permissão (desenvolvedor não desconecta;
  não dono não exclui), recusa de atividade com execução; `npm run test:integracao` se houver consulta nova (por exemplo "atividade
  tem execução").
- Builds de `shared`, `backend` e `frontend` passam; migration aplica e reverte.
- Verificação ao vivo como gestor e desenvolvedor: desconectar e desfazer, excluir e desfazer, pedir exclusão de atividade com execução e
  ver a explicação; 1920×1080, 1366×768 e 1080×1920, tema claro e escuro.

## Fora de Escopo

- Qualquer outra exclusão pela IA (demanda, projeto, execução, tag); excluir atividade com execução.
- A regra de níveis em si (228) e o grupo (227).

## Dependências

Para o nível `FAZ_E_AVISA` funcionar sem confirmação, a 228; sem ela, a proposta de desconectar nasce como `PERGUNTA` (comportamento
atual de todas). Aplicar `gerenciamento-de-impacto` ao registro de ferramentas.

## Riscos e Mitigação

- A exceção abrir caminho a outras exclusões. Mitigação: lista fixa e nomeada, com teste que quebra se crescer sem a spec.
