import { ApiProperty } from '@nestjs/swagger';

export class UsuarioSenhaAlteradaDto {
  @ApiProperty({ example: 'Senha alterada com sucesso' })
  mensagem: string;
}
