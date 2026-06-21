import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExecucaoIniciarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  /**
   * Obrigatória para desenvolvedores; opcional para gestores.
   * A regra é validada no service conforme o tipo do usuário autenticado.
   */
  @IsOptional()
  @IsString()
  descricao?: string;
}
