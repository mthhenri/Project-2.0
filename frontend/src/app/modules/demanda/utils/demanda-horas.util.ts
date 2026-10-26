import { DemandaGrafoNoDto, ExecutorAtivoDto, TipoDemandaStatusEnum } from '@project20/shared';

/**
 * Regras puras do Controle de horas (task 240): a cor e o desenho da barra, o total de cada pasta (horas próprias mais as de tudo que está
 * dentro dela) e os textos de "há quanto tempo".
 */

/** A barra vai até 150% do estimado; o risco marca os 100%. */
export const PERCENTUAL_MAXIMO_DA_BARRA = 150;

type Canal = readonly [number, number, number];
const AZUL: Canal = [59, 130, 246];
const AMARELO: Canal = [234, 179, 8];
const LARANJA: Canal = [249, 115, 22];
const VERMELHO: Canal = [239, 68, 68];
const VERMELHO_FORTE: Canal = [185, 28, 28];

function interpolar(de: Canal, ate: Canal, t: number): Canal {
  const fator = Math.max(0, Math.min(1, t));
  return [
    Math.round(de[0] + (ate[0] - de[0]) * fator),
    Math.round(de[1] + (ate[1] - de[1]) * fator),
    Math.round(de[2] + (ate[2] - de[2]) * fator),
  ];
}

const paraRgb = (canal: Canal): string => `rgb(${canal[0]}, ${canal[1]}, ${canal[2]})`;

/**
 * Cor da barra pelo percentual executado/estimado: azul até 75%, amarelo (75–85), laranja (85–95) e vermelho (95–100); acima de 100% escurece
 * para um vermelho forte, saturando em 150%. Sem estimativa (`null`), azul.
 */
export function corDaBarraHoras(percentual: number | null): string {
  if (percentual === null || percentual <= 75) return paraRgb(AZUL);
  if (percentual <= 85) return paraRgb(interpolar(AZUL, AMARELO, (percentual - 75) / 10));
  if (percentual <= 95) return paraRgb(interpolar(AMARELO, LARANJA, (percentual - 85) / 10));
  if (percentual <= 100) return paraRgb(interpolar(LARANJA, VERMELHO, (percentual - 95) / 5));
  return paraRgb(interpolar(VERMELHO, VERMELHO_FORTE, (percentual - 100) / 50));
}

/** O percentual executado sobre o estimado, arredondado; `null` quando não há estimativa. */
export function percentualDeHoras(minutosExecutados: number, horasEstimadas: number): number | null {
  return horasEstimadas > 0 ? Math.round((minutosExecutados / (horasEstimadas * 60)) * 100) : null;
}

export interface BarraHoras {
  /** Percentual real (pode passar de 100); `null` sem estimativa. */
  percentual: number | null;
  /** Largura do preenchimento, de 0 a 100 da largura da barra (que equivale a 150% do estimado). */
  larguraPreenchimento: number;
  /** Onde fica o risco dos 100%, de 0 a 100 da largura da barra. */
  posicaoDoRisco: number;
  cor: string;
  estourou: boolean;
  /** Minutos acima do estimado (0 se não passou). */
  minutosAcima: number;
  /** Minutos que faltam para o estimado; `null` quando não há estimativa ou já passou. */
  minutosRestantes: number | null;
}

export function calcularBarraHoras(minutosExecutados: number, horasEstimadas: number): BarraHoras {
  const percentual = percentualDeHoras(minutosExecutados, horasEstimadas);
  const minutosEstimados = horasEstimadas * 60;
  const estourou = percentual !== null && minutosExecutados > minutosEstimados;
  return {
    percentual,
    larguraPreenchimento: percentual === null ? 0 : (Math.min(percentual, PERCENTUAL_MAXIMO_DA_BARRA) / PERCENTUAL_MAXIMO_DA_BARRA) * 100,
    posicaoDoRisco: (100 / PERCENTUAL_MAXIMO_DA_BARRA) * 100,
    cor: corDaBarraHoras(percentual),
    estourou,
    minutosAcima: estourou ? minutosExecutados - minutosEstimados : 0,
    minutosRestantes: percentual !== null && !estourou ? Math.max(0, minutosEstimados - minutosExecutados) : null,
  };
}

// ---------------------------------------------------------------------------
// Árvore de horas
// ---------------------------------------------------------------------------

export interface NoHoras {
  no: DemandaGrafoNoDto;
  nivel: number;
  /** Horas e minutos só da própria demanda (atividades diretas). */
  horasProprias: number;
  minutosProprios: number;
  /** A própria demanda mais tudo que está dentro dela. */
  horasTotais: number;
  minutosTotais: number;
  filhos: NoHoras[];
}

const pastasPrimeiro = (a: DemandaGrafoNoDto, b: DemandaGrafoNoDto): number => Number(b.isEstrutural) - Number(a.isEstrutural);

/**
 * A árvore do projeto com o total de cada pasta (horas próprias mais as dos descendentes). Demanda cancelada fica de fora, com o que está dentro
 * dela; as pastas vêm antes das demandas, cada grupo na ordem que chegou (por nome).
 */
export function montarArvoreDeHoras(nos: readonly DemandaGrafoNoDto[]): NoHoras[] {
  const visiveis = nos.filter((no) => no.status !== TipoDemandaStatusEnum.CANCELADA);
  const ids = new Set(visiveis.map((no) => no.id));
  const filhosPorPai = new Map<number, DemandaGrafoNoDto[]>();
  for (const no of visiveis) {
    if (no.demandaPaiId !== null && no.demandaPaiId !== undefined && ids.has(no.demandaPaiId)) {
      filhosPorPai.set(no.demandaPaiId, [...(filhosPorPai.get(no.demandaPaiId) ?? []), no]);
    }
  }
  const montar = (no: DemandaGrafoNoDto, nivel: number): NoHoras => {
    const filhos = (filhosPorPai.get(no.id) ?? []).slice().sort(pastasPrimeiro).map((filho) => montar(filho, nivel + 1));
    return {
      no,
      nivel,
      horasProprias: no.horasEstimadas,
      minutosProprios: no.minutosExecutados,
      horasTotais: filhos.reduce((soma, filho) => soma + filho.horasTotais, no.horasEstimadas),
      minutosTotais: filhos.reduce((soma, filho) => soma + filho.minutosTotais, no.minutosExecutados),
      filhos,
    };
  };
  return visiveis
    .filter((no) => no.demandaPaiId === null || no.demandaPaiId === undefined || !ids.has(no.demandaPaiId))
    .sort(pastasPrimeiro)
    .map((no) => montar(no, 0));
}

/** As linhas que aparecem agora: pasta recolhida esconde o que tem dentro. */
export function linhasVisiveisDeHoras(raizes: readonly NoHoras[], recolhidas: ReadonlySet<number>): NoHoras[] {
  const linhas: NoHoras[] = [];
  const percorrer = (nos: readonly NoHoras[]) => {
    for (const no of nos) {
      linhas.push(no);
      if (!recolhidas.has(no.no.id)) percorrer(no.filhos);
    }
  };
  percorrer(raizes);
  return linhas;
}

/** O id de cada ancestral de uma demanda, do pai para cima (para abrir o caminho até a pasta escolhida). */
export function ancestraisDe(raizes: readonly NoHoras[], demandaId: number): number[] {
  const achar = (nos: readonly NoHoras[], caminho: number[]): number[] | null => {
    for (const no of nos) {
      if (no.no.id === demandaId) return caminho;
      const dentro = achar(no.filhos, [...caminho, no.no.id]);
      if (dentro) return dentro;
    }
    return null;
  };
  return (achar(raizes, []) ?? []).reverse();
}

export interface ResumoDeHoras {
  horasEstimadas: number;
  minutosExecutados: number;
  /** Soma do que cada demanda com estimativa passou do próprio estimado. */
  minutosAcima: number;
  demandasEstouradas: number;
}

/** O resumo do topo: soma de todas as demandas do projeto (uma vez cada), sem os totais das pastas. */
export function resumirHoras(raizes: readonly NoHoras[]): ResumoDeHoras {
  const resumo: ResumoDeHoras = { horasEstimadas: 0, minutosExecutados: 0, minutosAcima: 0, demandasEstouradas: 0 };
  const percorrer = (nos: readonly NoHoras[]) => {
    for (const no of nos) {
      resumo.horasEstimadas += no.horasProprias;
      resumo.minutosExecutados += no.minutosProprios;
      const acima = no.horasProprias > 0 ? no.minutosProprios - no.horasProprias * 60 : 0;
      if (acima > 0) {
        resumo.minutosAcima += acima;
        resumo.demandasEstouradas += 1;
      }
      percorrer(no.filhos);
    }
  };
  percorrer(raizes);
  return resumo;
}

// ---------------------------------------------------------------------------
// Quem executa agora e há quanto tempo
// ---------------------------------------------------------------------------

/** "há 12 min", "há 3h", "há 2 dias": o tempo desde `data` até `agora`. */
export function haQuantoTempo(data: Date | string, agora: Date = new Date()): string {
  const instante = new Date(data).getTime();
  if (Number.isNaN(instante)) return '';
  const minutos = Math.max(0, Math.floor((agora.getTime() - instante) / 60_000));
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/** As iniciais do nome para a bolinha do executor ("Maria Silva" → "MS"). */
export function iniciaisDoNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export interface ExecutorDoResumo {
  usuarioId: number;
  nomeCompleto: string;
  /** Início mais antigo entre as execuções abertas dele. */
  inicioData: Date | string;
}

/** Cada pessoa uma vez só, mesmo executando em mais de uma demanda. */
export function executoresUnicos(executores: readonly ExecutorAtivoDto[]): ExecutorDoResumo[] {
  const porUsuario = new Map<number, ExecutorDoResumo>();
  for (const executor of executores) {
    const existente = porUsuario.get(executor.usuarioId);
    if (!existente || new Date(executor.inicioData) < new Date(existente.inicioData)) {
      porUsuario.set(executor.usuarioId, { usuarioId: executor.usuarioId, nomeCompleto: executor.nomeCompleto, inicioData: executor.inicioData });
    }
  }
  return [...porUsuario.values()];
}
