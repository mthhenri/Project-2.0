export class ExecucaoSobreposicaoValidarDto {
  usuarioId: number;
  inicioData: Date;
  fimData: Date;
  /** Execução a desconsiderar (a que está sendo corrigida, para não colidir com ela mesma). */
  ignorarExecucaoId?: number;
}
