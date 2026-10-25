import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Entrada da ferramenta `propor_excluir_atividade` e, com os nomes para o cartão, os dados da proposta `EXCLUIR_ATIVIDADE`: exclui (soft delete)
 * uma atividade que **nunca teve execução**. Com execução, a IA não oferece: a exclusão é feita pela tela.
 */
export class ProporExcluirAtividadeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;
}

/** Os dados guardados na proposta: a entrada mais os nomes, só para o cartão mostrar. */
export class PropostaExcluirAtividadeDadosDto extends ProporExcluirAtividadeDto {
  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;
}
