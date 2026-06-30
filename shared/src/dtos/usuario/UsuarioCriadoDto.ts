import { ApiProperty } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';
import { TipoUsuarioStatusEnum } from '../../enums/tipo-usuario-status.enum';

export class UsuarioCriadoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'joao.silva' })
  login: string;

  @ApiProperty({ example: 'João Silva' })
  nomeCompleto: string;

  @ApiProperty({ example: 'Desenvolvedor Sênior' })
  cargoTitulo: string;

  @ApiProperty({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.DESENVOLVEDOR })
  tipo: TipoUsuarioEnum;

  @ApiProperty({ enum: TipoUsuarioStatusEnum, example: TipoUsuarioStatusEnum.ATIVO })
  status: TipoUsuarioStatusEnum;

  @ApiProperty({ example: 8 })
  horasDiariasNecessarias: number;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: Date;
}
