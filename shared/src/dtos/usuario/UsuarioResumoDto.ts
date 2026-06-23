import { ApiProperty } from '@nestjs/swagger';
import { UsuarioTipoEnum } from '../../enums/usuario-tipo.enum';
import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

export class UsuarioResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'joao.silva' })
  login: string;

  @ApiProperty({ example: 'João Silva' })
  nomeCompleto: string;

  @ApiProperty({ example: 'Desenvolvedor Sênior' })
  cargoTitulo: string;

  @ApiProperty({ enum: UsuarioTipoEnum, example: UsuarioTipoEnum.DESENVOLVEDOR })
  tipo: UsuarioTipoEnum;

  @ApiProperty({ enum: UsuarioStatusEnum, example: UsuarioStatusEnum.ATIVO })
  status: UsuarioStatusEnum;

  @ApiProperty({ example: true, description: 'Indica se o usuário possui anotações registradas' })
  temAnotacoes: boolean;
}
