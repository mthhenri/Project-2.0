import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_criar_demanda` e, com os campos de exibição, os dados da proposta `CRIAR_DEMANDA`. O projeto vem de
 * `projetoId` (já existente) ou de `projetoPropostaId` (uma proposta `CRIAR_PROJETO` confirmada antes); a demanda pai, de
 * `demandaPaiId` ou de `demandaPaiPropostaId` (uma proposta `CRIAR_DEMANDA` confirmada antes), ou nenhuma (demanda de topo). A demanda
 * nasce PLANEJADA, com as mesmas regras de permissão da tela.
 */
export class ProporCriarDemandaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoPropostaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaPaiId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaPaiPropostaId?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  /** Demanda de estrutura: agrupa outras demandas e não recebe atividades. Sem o campo, é uma demanda de trabalho. */
  @IsOptional()
  @IsBoolean()
  isEstrutural?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  horasEstimadas?: number;

  @IsOptional()
  @IsString()
  descricaoTecnica?: string;

  @IsOptional()
  @IsString()
  descricaoCliente?: string;

  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;
}

/** Os dados guardados na proposta: a entrada mais os nomes do projeto e da demanda pai, só para o cartão mostrar. */
export class PropostaCriarDemandaDadosDto extends ProporCriarDemandaDto {
  @IsOptional()
  @IsString()
  projetoNome?: string;

  @IsOptional()
  @IsString()
  demandaPaiNome?: string;
}
