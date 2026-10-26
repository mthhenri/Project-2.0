import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class PlanoAlterarDto {
  /** Versão que o cliente leu; gravação sobre versão mais nova é recusada. */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  versao: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo?: string;

  /** `null` limpa o texto; ausente não mexe nele. */
  @IsOptional()
  @IsString()
  descricaoTecnica?: string | null;

  /** Só gestor e administrador gravam. */
  @IsOptional()
  @IsString()
  descricaoCliente?: string | null;

  @IsOptional()
  @IsString()
  documentacao?: string | null;
}
