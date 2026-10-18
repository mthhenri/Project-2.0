import { MudancaDeAtividadeDto, MudancaDeExecucaoDto, MudancasDaQuedaConsultadasDto } from '@project20/shared';

export interface ExecucaoLida {
  atividade: string;
  demanda: string;
  descricao: string;
  inicio: Date;
  fim: Date | null;
}

export interface AtividadeLida {
  nome: string;
  demanda: string;
  criadaEm: Date;
}

function paraMudanca(execucao: ExecucaoLida): MudancaDeExecucaoDto {
  return {
    atividade: execucao.atividade,
    demanda: execucao.demanda,
    descricao: execucao.descricao,
    inicio: execucao.inicio.toISOString(),
    fim: execucao.fim ? execucao.fim.toISOString() : null,
  };
}

/**
 * O que mudou no sistema depois de `desde` (task 158), quando a IA volta de uma queda: execuções iniciadas e encerradas, a execução em
 * andamento agora e atividades criadas, tudo feito sem a IA. Função pura sobre o que as services entregam ao usuário.
 */
export function calcularMudancasDaQueda(entrada: { desde: Date; execucoes: ExecucaoLida[]; atividades: AtividadeLida[] }): MudancasDaQuedaConsultadasDto {
  const instante = entrada.desde.getTime();
  const iniciadas = entrada.execucoes.filter((execucao) => execucao.inicio.getTime() > instante);
  const encerradas = entrada.execucoes.filter((execucao) => execucao.fim !== null && execucao.fim.getTime() > instante);
  const ativa = entrada.execucoes.find((execucao) => execucao.fim === null) ?? null;
  const criadas: MudancaDeAtividadeDto[] = entrada.atividades
    .filter((atividade) => atividade.criadaEm.getTime() > instante)
    .map((atividade) => ({ nome: atividade.nome, demanda: atividade.demanda, criadaEm: atividade.criadaEm.toISOString() }));
  return {
    desde: entrada.desde.toISOString(),
    execucoesIniciadas: iniciadas.map(paraMudanca),
    execucoesEncerradas: encerradas.map(paraMudanca),
    execucaoAtiva: ativa ? paraMudanca(ativa) : null,
    atividadesCriadas: criadas,
    semMudancas: iniciadas.length === 0 && encerradas.length === 0 && criadas.length === 0,
  };
}
