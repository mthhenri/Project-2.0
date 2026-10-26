import { ApiProperty } from '@nestjs/swagger';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

/** Uma demanda que o usuário executou, para a lateral "Minhas demandas" do chat. */
export class DemandaExecutadaResumoDto {
  @ApiProperty({ example: 12 })
  demandaId: number;

  @ApiProperty({ example: 'Cadastro de usuário' })
  nome: string;

  @ApiProperty({ example: 'Segurança › Cadastro de usuário', description: 'Árvore de nomes da raiz até a demanda, dentro do projeto' })
  caminho: string;

  @ApiProperty({ example: 3 })
  projetoId: number;

  @ApiProperty({ example: 'Portal do Cliente' })
  nomeProjeto: string;

  @ApiProperty({ enum: TipoDemandaStatusEnum })
  status: TipoDemandaStatusEnum;

  @ApiProperty({ example: 8 })
  horasEstimadas: number;

  @ApiProperty({ example: 120, description: 'Soma das execuções das atividades da demanda (de todos); a execução aberta conta até agora' })
  minutosExecutados: number;

  @ApiProperty({ example: 5 })
  totalAtividades: number;

  @ApiProperty({ example: 2, description: 'Quantas atividades estão DESENVOLVIDA' })
  atividadesDesenvolvidas: number;

  @ApiProperty({ example: true, description: 'O usuário tem uma execução em andamento nesta demanda' })
  executando: boolean;

  @ApiProperty({ description: 'Início da execução mais recente do usuário na demanda' })
  ultimaExecucaoData: Date;
}
