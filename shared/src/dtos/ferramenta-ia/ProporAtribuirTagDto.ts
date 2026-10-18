import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const ALVOS_DE_TAG = ['DEMANDA', 'ATIVIDADE'] as const;
export type AlvoDeTag = (typeof ALVOS_DE_TAG)[number];

/**
 * Entrada da ferramenta `propor_atribuir_tag` (gestor) e, com os campos de exibição, os dados da proposta `ATRIBUIR_TAG`: acrescenta
 * e/ou tira tags (`adicionarTagIds` e `removerTagIds`, ids de `listar_tags`) de uma demanda ou de uma atividade. O sistema calcula o
 * conjunto final a partir das tags de hoje; o que já está como pedido não conta como mudança.
 */
export class ProporAtribuirTagDto {
  @IsIn(ALVOS_DE_TAG)
  alvo: AlvoDeTag;

  /** Id da demanda ou da atividade, conforme `alvo`. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  alvoId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  adicionarTagIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  removerTagIds?: number[];
}

/** Os dados guardados na proposta: a entrada mais os nomes e o conjunto de antes e de depois, para o cartão e para o desfazer. */
export class PropostaAtribuirTagDadosDto extends ProporAtribuirTagDto {
  @IsOptional()
  @IsString()
  alvoNome?: string;

  /** Só para atividade: a demanda dela. */
  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsAntesNomes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsDepoisNomes?: string[];
}
