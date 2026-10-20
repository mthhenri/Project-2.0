import { IaModeloPrecoDto } from './IaModeloPrecoDto';

/** O total do recorte. `custoDolar` soma só os modelos com preço; `modelosSemPreco` diz quantos ficaram de fora. */
export interface IaCustoTotaisDto {
  mensagens: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCache: number;
  custoDolar: number;
  modelosSemPreco: number;
}

/** O uso de um modelo no recorte. `preco` é `null` sem preço cadastrado (e então `custoDolar` também). Modelos sem uso aparecem com zeros. */
export interface IaCustoModeloDto {
  modelo: string;
  mensagens: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCache: number;
  preco: IaModeloPrecoDto | null;
  custoDolar: number | null;
  /** `true` para o modelo que a configuração ativa usa em algum nível. */
  emUso: boolean;
}

/** O uso de um dia (recorte de mês) ou de um mês (recorte de ano). */
export interface IaCustoPeriodoDto {
  /** `yyyy-mm-dd` no recorte de mês; `yyyy-mm` no de ano. */
  periodo: string;
  mensagens: number;
  tokens: number;
  custoDolar: number;
}

/** A aba "Custos": totais, uso por modelo (com o preço editável) e o uso ao longo do período. */
export interface IaCustoConsultadoDto {
  ano: number;
  mes: number | null;
  totais: IaCustoTotaisDto;
  modelos: IaCustoModeloDto[];
  periodos: IaCustoPeriodoDto[];
}
