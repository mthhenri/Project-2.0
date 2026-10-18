import { AtividadeParadaDto, ExecucaoDaPessoaDto, PessoaDaEquipeDto } from '@project20/shared';

export interface ExecucaoDeAlguem {
  usuarioId: number;
  usuario: string;
  atividade: string;
  demanda: string;
  projeto: string;
  descricao: string;
  inicio: Date;
  fim: Date | null;
  minutos: number | null;
}

/** Agrupa as execuções do dia por pessoa (por nome), com o total de minutos de cada uma; dentro de cada pessoa, da mais antiga para a mais nova. */
export function agruparExecucoesPorPessoa(execucoes: ExecucaoDeAlguem[]): PessoaDaEquipeDto[] {
  const porPessoa = new Map<number, PessoaDaEquipeDto>();
  for (const execucao of [...execucoes].sort((a, b) => a.inicio.getTime() - b.inicio.getTime())) {
    const pessoa = porPessoa.get(execucao.usuarioId) ?? { usuarioId: execucao.usuarioId, usuario: execucao.usuario, totalMinutos: 0, execucoes: [] };
    const item: ExecucaoDaPessoaDto = {
      atividade: execucao.atividade,
      demanda: execucao.demanda,
      projeto: execucao.projeto,
      descricao: execucao.descricao,
      inicio: execucao.inicio.toISOString(),
      fim: execucao.fim ? execucao.fim.toISOString() : null,
      minutos: execucao.minutos,
    };
    pessoa.execucoes.push(item);
    pessoa.totalMinutos += execucao.minutos ?? 0;
    porPessoa.set(execucao.usuarioId, pessoa);
  }
  return [...porPessoa.values()].sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));
}

export interface AtividadeEmAberto {
  id: number;
  nome: string;
  usuario: string;
  demanda: string;
  projeto: string;
  emExecucao: boolean;
  criadaEm: Date;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * As atividades paradas: sem execução em andamento e cuja última execução (ou, se nunca teve, a criação) foi há `diasParada` dias ou
 * mais. A mais antiga primeiro.
 */
export function calcularAtividadesParadas(entrada: {
  atividades: AtividadeEmAberto[];
  ultimaExecucao: Map<number, Date>;
  agora: Date;
  diasParada: number;
}): AtividadeParadaDto[] {
  const paradas: AtividadeParadaDto[] = [];
  for (const atividade of entrada.atividades) {
    if (atividade.emExecucao) continue;
    const ultima = entrada.ultimaExecucao.get(atividade.id);
    const base = ultima ?? atividade.criadaEm;
    const dias = Math.floor((entrada.agora.getTime() - base.getTime()) / MS_POR_DIA);
    if (dias < entrada.diasParada) continue;
    paradas.push({ id: atividade.id, nome: atividade.nome, usuario: atividade.usuario, demanda: atividade.demanda, projeto: atividade.projeto, diasSemExecucao: dias, nuncaExecutada: ultima === undefined });
  }
  return paradas.sort((a, b) => b.diasSemExecucao - a.diasSemExecucao || a.nome.localeCompare(b.nome, 'pt-BR'));
}
