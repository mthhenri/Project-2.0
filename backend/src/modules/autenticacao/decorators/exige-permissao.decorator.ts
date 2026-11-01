import { SetMetadata } from '@nestjs/common';
import { TipoUsuarioEnum } from '@project20/shared';

/** Uma permissão por ação de `@project20/shared` (`podeEditarDemanda`, `podeGerenciarTag`, ...). */
export type PermissaoDeAcao = (tipo: TipoUsuarioEnum) => boolean;

export const CHAVE_PERMISSAO_EXIGIDA = 'permissaoExigida';

/**
 * Restringe a rota a quem tem a permissão da ação (ex.: `@ExigePermissao(podeGerenciarTag)`). Para o que é só do
 * gestor, `@GestorOnly()` continua valendo; esta serve às ações que o auxiliar também faz.
 */
export const ExigePermissao = (permissao: PermissaoDeAcao) => SetMetadata(CHAVE_PERMISSAO_EXIGIDA, permissao);
