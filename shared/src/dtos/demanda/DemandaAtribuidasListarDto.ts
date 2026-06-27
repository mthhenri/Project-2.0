/**
 * DTO interno para listar as demandas atribuídas a um usuário.
 * Substitui o primitivo `usuarioId` em `DemandaRepository.listarAtribuidas` (§16 #21).
 */
export class DemandaAtribuidasListarDto {
  usuarioId: number;
  /**
   * true → desenvolvedor: filtra por demanda_usuario (apenas demandas atribuídas a ele).
   * false → gestor: retorna todas as demandas (acesso total, sem depender de demanda_usuario).
   */
  apenasAtribuidas: boolean;
}
