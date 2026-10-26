import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

export class PlanoInternoPublicarDto {
  id: number;
  versao: number;
  abas: PlanoAbaEnum[];
  abasParaApagar?: PlanoAbaEnum[];
}
