import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** Uma seção do pad. `updatedDate` é a versão lida: volta nas alterações para detectar conflito. */
export interface AnotacaoResumoDto {
  id: number;
  usuarioId: number;
  tipo: TipoAnotacaoEnum;
  /** Markdown; seção vazia é `''`. */
  texto: string;
  updatedDate: Date;
}
