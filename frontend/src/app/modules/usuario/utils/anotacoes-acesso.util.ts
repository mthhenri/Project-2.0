import { TipoUsuarioEnum, temPermissaoDeGestor } from '@project20/shared';

/**
 * Quem abre o pad de `donoId` (task 195, a mesma regra do backend): cada um abre o próprio; gestor e administrador também abrem o dos
 * desenvolvedores, nunca o de outro gestor ou administrador; o desenvolvedor só o próprio.
 */
export function podeAbrirAnotacoes(
  ator: { id: number; tipo: TipoUsuarioEnum },
  dono: { id: number; tipo: TipoUsuarioEnum },
): boolean {
  if (ator.id === dono.id) return true;
  return temPermissaoDeGestor(ator.tipo) && !temPermissaoDeGestor(dono.tipo);
}
