import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

/**
 * Entrada da ferramenta `resolver_ponto_do_plano`: fecha um ponto como `RESOLVIDO` (a pessoa respondeu; passe a resposta), `DISPENSADO`
 * (ela disse que não importa; o motivo é opcional) ou `DECISAO` (ficou decidido; passe a decisão).
 */
export class PlanoPontoResolverDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  pontoId: number;

  @IsEnum(TipoPlanoPontoSituacaoEnum)
  situacao: TipoPlanoPontoSituacaoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolucaoTexto?: string;
}
