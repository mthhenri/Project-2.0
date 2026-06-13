import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UsuarioSenhaAlterarDto {
  @ApiProperty({ example: 'senhaAntiga@123' })
  @IsString()
  @MinLength(8)
  senhaAtual: string;

  @ApiProperty({ example: 'senhaNova@456' })
  @IsString()
  @MinLength(8)
  senhaNova: string;
}
