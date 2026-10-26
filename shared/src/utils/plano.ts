import { PlanoAbaEnum } from '../enums/plano-aba.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { temPermissaoDeGestor } from './permissao-usuario';

/** Título do plano quando a pessoa não dá um. */
export const TITULO_PADRAO_DO_PLANO = 'Plano sem título';

/** A aba é visível a quem? A descrição do cliente é exclusiva de gestor e administrador (`SYSTEM.SPEC.md` §14); as outras são de todos. */
export function podeVerAbaDoPlano(aba: PlanoAbaEnum, tipoUsuario: TipoUsuarioEnum): boolean {
  return aba !== PlanoAbaEnum.DESCRICAO_CLIENTE || temPermissaoDeGestor(tipoUsuario);
}

export interface PlanoAcessoEntrada {
  tipoUsuario: TipoUsuarioEnum;
  usuarioId: number;
  /** Quem criou o plano. */
  criadorId: number;
  /** `null` no plano amplo. */
  projetoId: number | null;
  isSolo: boolean;
  /** Desenvolvedor com ao menos uma linha em `demanda_usuario` no projeto do plano; ignorado para gestor e administrador. */
  temAcessoAoProjeto: boolean;
}

/**
 * Quem vê e edita o plano: plano amplo e plano solo, só o criador (nem gestor nem administrador entram);
 * plano de projeto, quem tem acesso ao projeto (gestor e administrador por tipo, desenvolvedor por `demanda_usuario`).
 * Ver e editar são a mesma regra.
 */
export function podeAcessarPlano(entrada: PlanoAcessoEntrada): boolean {
  if (entrada.projetoId === null || entrada.isSolo) return entrada.usuarioId === entrada.criadorId;
  return temPermissaoDeGestor(entrada.tipoUsuario) || entrada.temAcessoAoProjeto;
}

/** Arquivar e excluir: o criador, o gestor e o administrador (quem já acessa o plano). */
export function podeArquivarOuExcluirPlano(tipoUsuario: TipoUsuarioEnum, usuarioId: number, criadorId: number): boolean {
  return usuarioId === criadorId || temPermissaoDeGestor(tipoUsuario);
}

/** Ponto de partida ao ligar a demanda: a aba vazia do plano começa com o texto atual da demanda; aba já escrita não é sobrescrita. */
export function textoInicialDaAba(textoDoPlano: string | null, textoDaDemanda: string | null): string | null {
  const planoVazio = textoDoPlano === null || textoDoPlano.trim() === '';
  const demandaTemTexto = textoDaDemanda !== null && textoDaDemanda.trim() !== '';
  return planoVazio && demandaTemTexto ? textoDaDemanda : null;
}
