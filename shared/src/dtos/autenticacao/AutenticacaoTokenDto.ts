import { ApiProperty } from '@nestjs/swagger';
import { UsuarioTipoEnum } from '../../enums';

export class AutenticacaoTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImxvZ2luIjoiam9hby5zaWx2YSIsInRpcG8iOiJHRVNUT1IifQ.signature' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tipo: string;

  @ApiProperty({
    example: { id: 1, login: 'joao.silva', nomeCompleto: 'João Silva', tipo: 'GESTOR' },
  })
  usuario: { id: number; login: string; nomeCompleto: string; tipo: UsuarioTipoEnum };
}
