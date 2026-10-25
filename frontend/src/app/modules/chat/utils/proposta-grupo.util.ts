import {
  idsDasPropostasDeQueDepende,
  podeDesfazerProposta,
  PropostaIaResumoDto,
  StatusPropostaIaEnum,
} from '@project20/shared';

/** As propostas do grupo já lidas, por id (a que ainda não chegou não está no objeto). */
export type PropostasDoGrupo = Readonly<Record<number, PropostaIaResumoDto | undefined>>;

/** O que o cabeçalho do grupo precisa saber (task 227). */
export interface ResumoDoGrupo {
  total: number;
  /** Ainda não chegaram todas: o cabeçalho espera para não mostrar contagem errada. */
  carregando: boolean;
  /** Pendentes que entram no "Confirmar todas" e no "Recusar todas" (as que o usuário tirou do grupo ficam de fora). */
  pendentes: number[];
  /** Pendentes que o usuário tirou do grupo: seguem pendentes, mas nenhuma ação em grupo as alcança. */
  foraDoGrupo: number[];
  /** Confirmadas ou ajustadas. */
  feitas: number[];
  /** Feitas que ainda estão dentro do prazo de desfazer (as que o "Desfazer todas" alcança). */
  desfaziveis: number[];
  /** Feitas que a IA executou sozinha (nível "Faz e avisa", task 228), e as que ainda dá para desfazer. */
  feitasPelaIa: number[];
  desfaziveisPelaIa: number[];
  /** O grupo mistura níveis: a IA já fez alguma e ainda há o que o usuário decide (pendente ou tirada do grupo). A tela mostra a linha azul em cima. */
  misto: boolean;
  recusadas: number[];
  desfeitas: number[];
  /** Nenhuma pendente no grupo e ao menos uma feita: o cabeçalho mostra "N feitas · Ver · Desfazer todas". */
  resolvido: boolean;
  /** "2 feitas · 1 esperando você": só o que não é zero. */
  texto: string;
}

const concordar = (quantidade: number, singular: string, plural: string): string => `${quantidade} ${quantidade === 1 ? singular : plural}`;

/** Conta as propostas do grupo por situação e monta o texto do cabeçalho. */
export function resumirGrupo(ids: readonly number[], propostas: PropostasDoGrupo, foraDoGrupo: ReadonlySet<number>, agora: Date = new Date()): ResumoDoGrupo {
  const resumo: ResumoDoGrupo = {
    total: ids.length, carregando: false, pendentes: [], foraDoGrupo: [], feitas: [], desfaziveis: [], feitasPelaIa: [], desfaziveisPelaIa: [], misto: false,
    recusadas: [], desfeitas: [], resolvido: false, texto: '',
  };
  for (const id of ids) {
    const proposta = propostas[id];
    if (!proposta) {
      resumo.carregando = true;
      continue;
    }
    if (proposta.status === StatusPropostaIaEnum.PENDENTE) (foraDoGrupo.has(id) ? resumo.foraDoGrupo : resumo.pendentes).push(id);
    else if (proposta.status === StatusPropostaIaEnum.CONFIRMADA || proposta.status === StatusPropostaIaEnum.AJUSTADA) {
      const desfazivel = podeDesfazerProposta(proposta.resolucaoData, agora);
      resumo.feitas.push(id);
      if (desfazivel) resumo.desfaziveis.push(id);
      if (proposta.aplicadaPelaIa) {
        resumo.feitasPelaIa.push(id);
        if (desfazivel) resumo.desfaziveisPelaIa.push(id);
      }
    } else if (proposta.status === StatusPropostaIaEnum.EXPIRADA) resumo.recusadas.push(id);
    else resumo.desfeitas.push(id);
  }
  resumo.resolvido = !resumo.carregando && resumo.pendentes.length === 0 && resumo.feitas.length > 0;
  resumo.misto = resumo.feitasPelaIa.length > 0 && resumo.pendentes.length + resumo.foraDoGrupo.length > 0;
  // No grupo misto o que a IA fez já está na linha azul de cima: o resumo conta só o resto. Todas feitas pela IA: o resumo diz isso.
  const feitasDoResumo = resumo.misto ? resumo.feitas.length - resumo.feitasPelaIa.length : resumo.feitas.length;
  const todasPelaIa = resumo.feitasPelaIa.length === resumo.feitas.length;
  const partes = [
    feitasDoResumo > 0 ? `${concordar(feitasDoResumo, 'feita', 'feitas')}${todasPelaIa ? ' pela IA' : ''}` : '',
    resumo.pendentes.length > 0 ? `${resumo.pendentes.length} esperando você` : '',
    resumo.foraDoGrupo.length > 0 ? `${resumo.foraDoGrupo.length} fora do grupo` : '',
    resumo.recusadas.length > 0 ? concordar(resumo.recusadas.length, 'recusada', 'recusadas') : '',
    resumo.desfeitas.length > 0 ? concordar(resumo.desfeitas.length, 'desfeita', 'desfeitas') : '',
  ];
  resumo.texto = partes.filter((parte) => parte !== '').join(' · ');
  return resumo;
}

/** As posições (a partir de 1) no grupo das propostas de que esta depende; só as que estão no grupo. */
export function posicoesDeQueDepende(id: number, ids: readonly number[], propostas: PropostasDoGrupo): number[] {
  const proposta = propostas[id];
  if (!proposta) return [];
  return idsDasPropostasDeQueDepende(proposta.tipo, proposta.dados)
    .map((idReferenciado) => ids.indexOf(idReferenciado) + 1)
    .filter((posicao) => posicao > 0);
}
