import { ApiProperty } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';
import { TipoUsuarioStatusEnum } from '../../enums/tipo-usuario-status.enum';

export class UsuarioResumoDto {
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

  @ApiProperty({ example: true, description: 'Indica se o usuário possui anotações registradas' })
  temAnotacoes: boolean;
}
