import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/** Entrada da ferramenta `anotar_ponto_em_aberto` (conversa do planejamento): a IA anota livremente o que identifica no plano. */
export class PlanoPontoAnotarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  /** Rótulo curto e livre: Pergunta, Lacuna, Suposição, Peso demais, Contradição, Dependência, Risco, Fora do escopo... */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  rotulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  texto: string;
}
