import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Entrada da ferramenta `propor_mover_atividade` e, com os campos de exibição, os dados da proposta `MOVER_ATIVIDADE`: muda **uma** atividade de
 * demanda (o dono dela e o gestor). As execuções vão junto, porque pertencem à atividade.
 */
export class ProporMoverAtividadeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  /** A demanda para onde a atividade vai (de `listar_minhas_demandas` ou `listar_demandas_do_projeto`). */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaDestinoId: number;
}

/** Os dados guardados na proposta: a entrada mais a origem e os nomes, para o cartão mostrar de onde para onde e para o desfazer. */
export class PropostaMoverAtividadeDadosDto extends ProporMoverAtividadeDto {
  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaOrigemId: number;

  @IsOptional()
  @IsString()
  demandaOrigemNome?: string;

  @IsOptional()
  @IsString()
  demandaDestinoNome?: string;
}
