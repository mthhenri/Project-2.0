import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** O nome e o tipo atual de um usuário, mesmo excluído: a supervisão decide a elegibilidade da conversa pelo tipo de hoje. */
export interface UsuarioTipoListadoDto {
  id: number;
  nomeCompleto: string;
  tipo: TipoUsuarioEnum;
}
