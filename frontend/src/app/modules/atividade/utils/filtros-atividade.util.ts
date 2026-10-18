import { TipoAtividadeStatusEnum } from '@project20/shared';
import { ATIVIDADE_STATUS_NAO_DESENVOLVIDA, ATIVIDADE_STATUS_OPCOES } from '../models/atividade.model';

/** Os filtros da listagem de Atividades, na forma que viaja pela URL (datas em `yyyy-mm-dd`). */
export interface FiltrosAtividade {
  busca: string;
  /** Vazio é "todos os status". */
  status: TipoAtividadeStatusEnum[];
  usuarioId: number | null;
  /** Início e fim do período de criação; qualquer ponta pode faltar. */
  periodo: [string | null, string | null] | null;
  demandaId: number | null;
}

/** Quem lê os parâmetros: o `ParamMap` do Angular e o `URLSearchParams` servem. */
export interface LeitorDeParametros {
  get(nome: string): string | null;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const TODOS = 'todos';
const ORDEM_DOS_STATUS = ATIVIDADE_STATUS_OPCOES.map((opcao) => opcao.value as TipoAtividadeStatusEnum);

export function filtrosPadrao(): FiltrosAtividade {
  return { busca: '', status: [...ATIVIDADE_STATUS_NAO_DESENVOLVIDA], usuarioId: null, periodo: null, demandaId: null };
}

function inteiroPositivo(texto: string | null): number | null {
  const numero = Number(texto);
  return texto !== null && Number.isInteger(numero) && numero > 0 ? numero : null;
}

function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

/**
 * Lê os filtros da URL. O que falta vira o padrão (em aberto, sem busca) e o que vem inválido é ignorado: uma URL velha ou digitada
 * à mão nunca quebra a tela. Só o gestor filtra por usuário.
 */
export function lerFiltrosDaUrl(parametros: LeitorDeParametros, eGestor: boolean): FiltrosAtividade {
  const filtros = filtrosPadrao();
  filtros.busca = (parametros.get('busca') ?? '').trim();

  const status = parametros.get('status');
  if (status === TODOS) {
    filtros.status = [];
  } else if (status) {
    const validos = ORDEM_DOS_STATUS.filter((opcao) => status.split(',').includes(opcao));
    if (validos.length > 0) filtros.status = validos;
  }

  if (eGestor) filtros.usuarioId = inteiroPositivo(parametros.get('usuarioId'));
  filtros.demandaId = inteiroPositivo(parametros.get('demandaId'));

  const periodo = parametros.get('periodo');
  if (periodo) {
    const [inicio, fim] = periodo.split('_');
    const inicioValido = inicio && DATA_ISO.test(inicio) ? inicio : null;
    const fimValido = fim && DATA_ISO.test(fim) ? fim : null;
    if (inicioValido || fimValido) filtros.periodo = [inicioValido, fimValido];
  }
  return filtros;
}

/**
 * Os parâmetros da URL para estes filtros. Só vai o que foge do padrão: sem filtro a URL fica limpa. "Todos os status" é `status=todos`
 * (a lista vazia não cabe em um parâmetro).
 */
export function paraParametrosDaUrl(filtros: FiltrosAtividade): Record<string, string> {
  const parametros: Record<string, string> = {};
  if (filtros.busca.trim()) parametros['busca'] = filtros.busca.trim();
  if (!mesmoConjunto(filtros.status, ATIVIDADE_STATUS_NAO_DESENVOLVIDA)) {
    parametros['status'] = filtros.status.length === 0 ? TODOS : ORDEM_DOS_STATUS.filter((opcao) => filtros.status.includes(opcao)).join(',');
  }
  if (filtros.usuarioId) parametros['usuarioId'] = String(filtros.usuarioId);
  if (filtros.periodo && (filtros.periodo[0] || filtros.periodo[1])) parametros['periodo'] = `${filtros.periodo[0] ?? ''}_${filtros.periodo[1] ?? ''}`;
  if (filtros.demandaId) parametros['demandaId'] = String(filtros.demandaId);
  return parametros;
}

/** Quantos filtros fogem do padrão (o número do "Limpar filtros (N)"). O padrão "em aberto" não conta. */
export function contarFiltrosAtivos(filtros: FiltrosAtividade): number {
  return Object.keys(paraParametrosDaUrl(filtros)).length;
}

/** As duas listas de filtros são iguais (serve para saber se a URL mudou de verdade). */
export function filtrosIguais(a: FiltrosAtividade, b: FiltrosAtividade): boolean {
  const pa = paraParametrosDaUrl(a);
  const pb = paraParametrosDaUrl(b);
  const chaves = Object.keys(pa);
  return chaves.length === Object.keys(pb).length && chaves.every((chave) => pa[chave] === pb[chave]);
}
