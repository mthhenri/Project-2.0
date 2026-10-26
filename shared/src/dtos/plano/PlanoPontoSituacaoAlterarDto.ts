import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoPlanoPontoSituacaoEnum } from '../../enums/tipo-plano-ponto-situacao.enum';

/**
 * Muda a situação de um ponto: resolver (com a resposta), dispensar (o motivo é opcional), registrar a decisão (com o texto dela) ou reabrir
 * (volta a `ABERTO` e apaga a resolução). A service confere o texto obrigatório de `RESOLVIDO` e `DECISAO`.
 */
export class PlanoPontoSituacaoAlterarDto {
  @IsEnum(TipoPlanoPontoSituacaoEnum)
  situacao: TipoPlanoPontoSituacaoEnum;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolucaoTexto?: string;
}
