import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** Identifica uma seção do pad: dono e tipo. Compõe os DTOs das operações (`AnotacaoAlterarDto & AnotacaoRecuperarDto`). */
export interface AnotacaoRecuperarDto {
  usuarioId: number;
  tipo: TipoAnotacaoEnum;
}
