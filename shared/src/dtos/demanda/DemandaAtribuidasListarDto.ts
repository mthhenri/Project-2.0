/**
 * DTO interno para listar as demandas atribuídas a um usuário.
 * Substitui o primitivo `usuarioId` em `DemandaRepository.listarAtribuidas` (§16 #21).
 */
export class DemandaAtribuidasListarDto {
  usuarioId: number;
}
