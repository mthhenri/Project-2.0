import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Entrada da ferramenta `propor_descrever_demanda` (gestor): o relato que o gestor deu na entrevista, fiel e sem invenção. Pelo menos um
 * dos dois relatos; o que não foi contado não vira descrição. O sistema redige as descrições em Markdown (nível analítico).
 */
export class ProporDescreverDemandaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  /** O que o cliente pediu, nas palavras do gestor. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  relatoDoCliente?: string;

  /** O que será feito (a solução técnica), nas palavras do gestor. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  relatoTecnico?: string;
}

/**
 * Os dados da proposta `DESCREVER_DEMANDA`: as descrições redigidas (Markdown, editáveis no cartão; só o que veio do relato) e os nomes e
 * a situação anterior, para o cartão mostrar. Um campo ausente não é alterado.
 */
export class PropostaDescreverDemandaDadosDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricaoCliente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricaoTecnica?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsString()
  projetoNome?: string;
}
