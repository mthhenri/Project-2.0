import { IsString, IsNotEmpty, MinLength, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums';

export class UsuarioCriarDto {
  @ApiProperty({ example: 'joao.silva' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString()
  @MinLength(4)
  login: string;

  @ApiProperty({ example: 'senha@123' })
  @IsString()
  @MinLength(8)
  senhaNaoEncriptada: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  nomeCompleto: string;

  @ApiProperty({ example: 'Desenvolvedor Sênior' })
  @IsString()
  @IsNotEmpty()
  cargoTitulo: string;

  @ApiProperty({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.DESENVOLVEDOR })
  @IsEnum(TipoUsuarioEnum)
  tipo: TipoUsuarioEnum;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(1)
  @Max(24)
  horasDiariasNecessarias: number;
}
