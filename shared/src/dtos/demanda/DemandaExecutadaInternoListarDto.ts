/**
 * DTO interno do repository: as demandas das atividades do usuário em que há execução, da mais recente para a mais antiga.
 * A execução não tem coluna de usuário: o dono é o da atividade (`atividade.usuario_id`).
 */
export class DemandaExecutadaInternoListarDto {
  usuarioId: number;
  /** true → desenvolvedor: só as demandas em que ele tem linha em `demanda_usuario`. false → gestor e administrador: sem esse filtro. */
  apenasMembro: boolean;
  limite: number;
}
