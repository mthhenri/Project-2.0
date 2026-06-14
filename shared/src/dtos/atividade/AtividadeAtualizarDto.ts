import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeAtualizarDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(AtividadeStatusEnum)
  status?: AtividadeStatusEnum;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ordemExibicao?: number;
}
