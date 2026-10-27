/**
 * Quem pede a árvore da tela de Documentações (task 259), montado pela service a partir do token: o gestor e o administrador veem todas as
 * demandas; o desenvolvedor, as dos projetos em que tem ao menos uma linha em `demanda_usuario` (SYSTEM.SPEC.md §14).
 */
export class DemandaDocumentacaoListarDto {
  usuarioId: number;
  todosOsProjetos: boolean;
}
