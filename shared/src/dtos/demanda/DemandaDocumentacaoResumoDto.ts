import { ApiProperty } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

/**
 * Uma demanda na árvore do seletor da tela de Documentações (task 259): onde ela está, o status, se cada texto está preenchido (sem os textos), se há
 * execução da própria pessoa rodando nela e se a pessoa pode editá-la.
 */
export class DemandaDocumentacaoResumoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 3 })
  projetoId: number;

  @ApiProperty({ example: 'Portal do Cliente' })
  projetoNome: string;

  @ApiProperty({ example: null, nullable: true })
  demandaPaiId: number | null;

  @ApiProperty({ example: 'Parser' })
  nome: string;

  @ApiProperty({ example: 'IA › Integrador Gemini › Parser', description: 'Os nomes da raiz até a própria demanda.' })
  caminho: string;

  @ApiProperty({ enum: TipoDemandaStatusEnum, example: TipoDemandaStatusEnum.PLANEJADA })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: true })
  temDescricaoTecnica: boolean;

  @ApiProperty({ example: false })
  temDescricaoCliente: boolean;

  @ApiProperty({ example: false })
  temDocumentacao: boolean;

  @ApiProperty({ example: false, description: 'A pessoa tem uma execução ativa (sem fim) numa atividade dela nesta demanda.' })
  emExecucao: boolean;

  @ApiProperty({ example: true, description: 'Gestor sempre pode; desenvolvedor só quando é membro da demanda.' })
  podeEditar: boolean;
}
