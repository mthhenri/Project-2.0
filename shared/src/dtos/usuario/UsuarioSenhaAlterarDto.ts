import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UsuarioSenhaAlterarDto {
  @ApiProperty({ example: 'senhaNova@456' })
  @IsString()
  @MinLength(8)
  senhaNova: string;
}
