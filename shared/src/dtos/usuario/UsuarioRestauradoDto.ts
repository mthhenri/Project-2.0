import { ApiProperty } from '@nestjs/swagger';

export class UsuarioRestauradoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'joao.silva' })
  login: string;

  @ApiProperty({ example: 'João Silva' })
  nomeCompleto: string;
}
