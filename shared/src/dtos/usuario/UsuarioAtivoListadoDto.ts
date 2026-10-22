import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Um usuário ativo, só com o necessário para escolher com quem conversar (nome e tipo). */
export interface UsuarioAtivoListadoDto {
  id: number;
  nomeCompleto: string;
  tipo: TipoUsuarioEnum;
}
