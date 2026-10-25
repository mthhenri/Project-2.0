import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';

/**
 * Entrada da ferramenta `propor_concluir_demanda` e, com os campos de exibição, os dados da proposta `CONCLUIR_DEMANDA`: marca a demanda como
 * concluída (quem é da demanda e o gestor; a `DemandaService` confere). As atividades abertas **não mudam**: o cartão só avisa quantas são.
 */
export class ProporConcluirDemandaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;
}

/** Os dados guardados na proposta: a entrada mais os nomes, o status de antes (para o desfazer) e as atividades abertas, para o cartão. */
export class PropostaConcluirDemandaDadosDto extends ProporConcluirDemandaDto {
  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsString()
  projetoNome?: string;

  @IsOptional()
  @IsEnum(TipoDemandaStatusEnum)
  statusAnterior?: TipoDemandaStatusEnum;

  /** Quantas atividades da demanda ainda não estão desenvolvidas. */
  @IsOptional()
  @IsInt()
  @Min(0)
  atividadesEmAberto?: number;
}
