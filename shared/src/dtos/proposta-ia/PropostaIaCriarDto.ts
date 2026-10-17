import { TipoPropostaIaEnum } from '../../enums/tipo-proposta-ia.enum';

/** Uso interno (as ferramentas da IA): não há rota HTTP para criar proposta. */
export interface PropostaIaCriarDto {
  usuarioId: number;
  tipo: TipoPropostaIaEnum;
  dados: Record<string, unknown>;
}
