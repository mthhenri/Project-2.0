import { IsString, IsNotEmpty, MinLength, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { UsuarioTipoEnum } from '../../enums';

export class UsuarioCriarDto {
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString()
  @MinLength(4)
  login: string;

  @IsString()
  @MinLength(8)
  senhaNaoEncriptada: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  nomeCompleto: string;

  @IsString()
  @IsNotEmpty()
  cargoTitulo: string;

  @IsEnum(UsuarioTipoEnum)
  tipo: UsuarioTipoEnum;

  @IsNumber()
  @Min(1)
  @Max(24)
  horasDiariasNecessarias: number;
}
