import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class TagCriarDto {
  @ApiProperty({ example: 'Backend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  @ApiProperty({ example: '#6366f1' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor: string;
}
