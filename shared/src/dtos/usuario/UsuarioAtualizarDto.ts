import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, MinLength } from 'class-validator';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioAtualizarDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  nomeCompleto?: string;

  @IsOptional()
  @IsString()
  cargoTitulo?: string;

  @IsOptional()
  @IsString()
  anotacoes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  horasDiariasNecessarias?: number;

  @IsOptional()
  @IsEnum(UsuarioStatusEnum)
  status?: UsuarioStatusEnum;
}
