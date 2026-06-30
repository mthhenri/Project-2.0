import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';

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
  @IsEnum(TipoAtividadeStatusEnum)
  status?: TipoAtividadeStatusEnum;
}
