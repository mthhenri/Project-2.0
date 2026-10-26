import { TipoPlanoFonteOrigemEnum } from '../../enums/tipo-plano-fonte-origem.enum';

export interface PlanoFonteCriadoDto {
  id: number;
  planoId: number;
  titulo: string;
  origem: TipoPlanoFonteOrigemEnum;
}
