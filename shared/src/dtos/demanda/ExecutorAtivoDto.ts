import { ApiProperty } from '@nestjs/swagger';

/** Value-object: usuário com execução aberta (em andamento) numa atividade da demanda. */
export class ExecutorAtivoDto {
  @ApiProperty({ example: 1 })
  usuarioId: number;

  @ApiProperty({ example: 'Maria Silva' })
  nomeCompleto: string;
}
