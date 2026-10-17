import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';

/**
 * Regra única de "tem poder de gestor?". Toda decisão de permissão passa por aqui; comparar o
 * tipo diretamente (`tipo === GESTOR`) espalha a regra e quebra quando surge um tipo novo.
 * O administrador é um gestor com mais permissões, portanto também passa.
 */
export function temPermissaoDeGestor(tipo: TipoUsuarioEnum): boolean {
  return tipo === TipoUsuarioEnum.GESTOR || tipo === TipoUsuarioEnum.ADMINISTRADOR;
}

/** Permissões exclusivas do administrador (criar outros administradores, configurações da IA). */
export function temPermissaoDeAdministrador(tipo: TipoUsuarioEnum): boolean {
  return tipo === TipoUsuarioEnum.ADMINISTRADOR;
}
