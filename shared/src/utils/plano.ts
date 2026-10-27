import { PlanoAbaEnum } from '../enums/plano-aba.enum';
import { SituacaoDaAbaNaPublicacaoEnum } from '../enums/situacao-da-aba-na-publicacao.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { temPermissaoDeGestor } from './permissao-usuario';

/** Título do plano quando a pessoa não dá um. */
export const TITULO_PADRAO_DO_PLANO = 'Plano sem título';

/** A aba é visível a quem? Todas são de todos: o desenvolvedor lê o pedido do cliente para trabalhar (`SYSTEM.SPEC.md` §14, task 254). */
export function podeVerAbaDoPlano(_aba: PlanoAbaEnum, _tipoUsuario: TipoUsuarioEnum): boolean {
  return true;
}

/** A aba é editável por quem? A descrição do cliente só por gestor e administrador (`SYSTEM.SPEC.md` §14); as outras, por todos. */
export function podeEditarAbaDoPlano(aba: PlanoAbaEnum, tipoUsuario: TipoUsuarioEnum): boolean {
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

/** A conversa de um plano: `plano-<id>`. Não casa com `<usuarioId>-<yyyy-mm-dd>`, então nunca aparece nas conversas do dia. */
export function montarConversaIdDoPlano(planoId: number): string {
  return `plano-${planoId}`;
}

/** O texto da aba no plano (ou `null` quando está vazia). */
export function textoDaAbaDoPlano(
  plano: { descricaoTecnica: string | null; descricaoCliente?: string | null; documentacao: string | null },
  aba: PlanoAbaEnum,
): string | null {
  switch (aba) {
    case PlanoAbaEnum.DESCRICAO_TECNICA:
      return plano.descricaoTecnica;
    case PlanoAbaEnum.DESCRICAO_CLIENTE:
      return plano.descricaoCliente ?? null;
    default:
      return plano.documentacao;
  }
}

/** Quantas vezes o trecho aparece, igual e sem sobreposição, no texto. Trecho vazio nunca conta. */
export function contarOcorrenciasDoTrecho(texto: string, trecho: string): number {
  if (trecho === '') return 0;
  let total = 0;
  for (let posicao = texto.indexOf(trecho); posicao !== -1; posicao = texto.indexOf(trecho, posicao + trecho.length)) total += 1;
  return total;
}

/**
 * Troca o trecho pelo novo **só quando ele aparece exatamente uma vez** (a alteração de trecho do plano mexe num lugar só do documento); com zero
 * ocorrências (o texto mudou) ou com mais de uma (não dá para saber qual), devolve `null`.
 */
export function substituirTrechoUnico(texto: string, trechoAntigo: string, trechoNovo: string): string | null {
  if (contarOcorrenciasDoTrecho(texto, trechoAntigo) !== 1) return null;
  const inicio = texto.indexOf(trechoAntigo);
  return texto.slice(0, inicio) + trechoNovo + texto.slice(inicio + trechoAntigo.length);
}

/** O campo do plano (e da demanda) que guarda o texto de cada aba. */
export function campoDaAbaDoPlano(aba: PlanoAbaEnum): 'descricaoTecnica' | 'descricaoCliente' | 'documentacao' {
  switch (aba) {
    case PlanoAbaEnum.DESCRICAO_TECNICA:
      return 'descricaoTecnica';
    case PlanoAbaEnum.DESCRICAO_CLIENTE:
      return 'descricaoCliente';
    default:
      return 'documentacao';
  }
}

/** O que publicar a aba faria, comparando o texto do plano com o atual da demanda. Fonte de verdade da regra, usada pela service e pela tela. */
export function situacaoDaAbaNaPublicacao(textoDoPlano: string | null, textoDaDemanda: string | null): SituacaoDaAbaNaPublicacaoEnum {
  const planoVazio = textoDoPlano === null || textoDoPlano.trim() === '';
  const demandaVazia = textoDaDemanda === null || textoDaDemanda.trim() === '';
  if (planoVazio && demandaVazia) return SituacaoDaAbaNaPublicacaoEnum.IGUAL;
  if (planoVazio) return SituacaoDaAbaNaPublicacaoEnum.APAGARIA;
  return textoDoPlano === textoDaDemanda ? SituacaoDaAbaNaPublicacaoEnum.IGUAL : SituacaoDaAbaNaPublicacaoEnum.PUBLICARIA;
}
