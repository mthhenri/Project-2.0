import { TipoAtividadePrioridadeEnum } from '../../enums/tipo-atividade-prioridade.enum';

/** Uma prioridade como as telas a mostram: nome fixo, posição na ordenação e a cor (a única parte editável). */
export class AtividadePrioridadeResumoDto {
  codigo: TipoAtividadePrioridadeEnum;
  descricao: string;
  /** 1 é a mais urgente; a listagem de atividades ordena por ela. */
  ordem: number;
  /** `#rrggbb`. */
  cor: string;
}
