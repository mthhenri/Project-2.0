import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';

export class AtividadeAlterarDto {
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
}
