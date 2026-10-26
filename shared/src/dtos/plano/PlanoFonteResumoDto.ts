import { TipoPlanoFonteOrigemEnum } from '../../enums/tipo-plano-fonte-origem.enum';

/** A fonte na lista do plano: sem o conteúdo (ele vem em `PlanoFonteRecuperadaDto`). */
export interface PlanoFonteResumoDto {
  id: number;
  planoId: number;
  titulo: string;
  origem: TipoPlanoFonteOrigemEnum;
  usuarioId: number;
  /** Quem trouxe o material. */
  usuarioNome: string;
  /** Caracteres do conteúdo. */
  tamanho: number;
  createdDate: string;
}
