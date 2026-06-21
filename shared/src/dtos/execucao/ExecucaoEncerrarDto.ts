import { IsOptional, IsString } from 'class-validator';

export class ExecucaoEncerrarDto {
  /**
   * Obrigatória quando o dono da atividade é desenvolvedor; opcional quando é gestor.
   * A regra é validada no service conforme o tipo do dono da execução.
   */
  @IsOptional()
  @IsString()
  descricao?: string;
}
