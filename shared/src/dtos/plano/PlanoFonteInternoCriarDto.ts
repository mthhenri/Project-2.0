import { TipoPlanoFonteOrigemEnum } from '../../enums/tipo-plano-fonte-origem.enum';

export class PlanoFonteInternoCriarDto {
  planoId: number;
  titulo: string;
  conteudo: string;
  origem: TipoPlanoFonteOrigemEnum;
  usuarioId: number;
}
