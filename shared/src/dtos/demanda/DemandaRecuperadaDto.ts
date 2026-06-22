import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaStatusEnum } from '../../enums/demanda-status.enum';
import { DemandaPrioridadeEnum } from '../../enums/demanda-prioridade.enum';

export class DemandaRecuperadaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  projetoId: number;

  @ApiPropertyOptional({ example: null })
  demandaPaiId: number | null;

  @ApiProperty({ example: 'Implementar módulo de login' })
  nome: string;

  @ApiPropertyOptional({ example: 'Implementar autenticação JWT com refresh token' })
  descricaoTecnica: string | null;

  @ApiPropertyOptional({ example: 'O usuário deve poder entrar no sistema com email e senha' })
  descricaoCliente: string | null;

  @ApiPropertyOptional({ example: '# Documentação\n\nDescrição detalhada...' })
  documentacao: string | null;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiProperty({ enum: DemandaPrioridadeEnum, example: DemandaPrioridadeEnum.MEDIA })
  prioridade: DemandaPrioridadeEnum;

  @ApiProperty({ enum: DemandaStatusEnum, example: DemandaStatusEnum.PLANEJADA })
  status: DemandaStatusEnum;

  @ApiProperty({ example: false })
  isEstrutural: boolean;

  @ApiPropertyOptional({ example: '2026-12-31' })
  previsaoFimData: string | null;

  @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
  createdDate: string;

  @ApiProperty({
    example: true,
    description:
      'Indica se o usuário autenticado pode editar esta demanda. ' +
      'Gestor sempre pode; desenvolvedor só quando é membro (demanda_usuario).',
  })
  podeEditar: boolean;
}
