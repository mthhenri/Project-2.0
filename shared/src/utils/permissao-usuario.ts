import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';

/**
 * Regra única de "tem poder de gestor?". Toda decisão de permissão passa por aqui; comparar o
 * tipo diretamente (`tipo === GESTOR`) espalha a regra e quebra quando surge um tipo novo.
 */
export function temPermissaoDeGestor(tipo: TipoUsuarioEnum): boolean {
  return tipo === TipoUsuarioEnum.GESTOR;
}
