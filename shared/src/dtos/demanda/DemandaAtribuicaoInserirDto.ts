export class DemandaAtribuicaoInserirDto {
  /**
   * Usuários a atribuir à demanda na criação (linhas em demanda_usuario).
   * Pode ser `[]` (demanda criada por gestor sem membros selecionados → nenhuma
   * atribuição) ou conter o criador desenvolvedor e os membros escolhidos na criação.
   * O gestor não é atribuído por ser gestor — tem acesso total independentemente desta tabela.
   */
  usuarioIds: number[];
}
