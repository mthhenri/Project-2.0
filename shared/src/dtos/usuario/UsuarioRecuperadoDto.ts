import { ApiProperty } from '@nestjs/swagger';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioRecuperadoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'joao.silva' })
  login: string;

  @ApiProperty({ example: 'João Silva' })
  nomeCompleto: string;

  @ApiProperty({ example: 'Desenvolvedor Sênior' })
  cargoTitulo: string;

  @ApiProperty({ example: 'Responsável pelo módulo de autenticação.', nullable: true })
  anotacoes: string | null;

  @ApiProperty({ enum: UsuarioTipoEnum, example: UsuarioTipoEnum.DESENVOLVEDOR })
  tipo: UsuarioTipoEnum;

  @ApiProperty({ enum: UsuarioStatusEnum, example: UsuarioStatusEnum.ATIVO })
  status: UsuarioStatusEnum;

  @ApiProperty({ example: 8 })
  horasDiariasNecessarias: number;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: Date;
}
