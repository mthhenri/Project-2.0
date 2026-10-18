import { Injectable } from '@nestjs/common';
import {
  RelatorioDeExecucoesConsultadoDto,
  RelatorioDeExecucoesConsultarDto,
  RelatorioExecucaoDto,
  RelatorioPeriodoTipoEnum,
  TotalDoRelatorioDto,
} from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { RelatorioService } from '../services/relatorio.service';

/** Quantas atividades (as de mais tempo) entram no resumo. */
export const LIMITE_ATIVIDADES_DO_RELATORIO = 15;

/** Soma as linhas do relatório por uma chave (usuário ou atividade), da maior para a menor em minutos. Pura. */
export function somarPorChave(linhas: readonly { minutos: number; chave: string }[]): TotalDoRelatorioDto[] {
  const totais = new Map<string, TotalDoRelatorioDto>();
  for (const linha of linhas) {
    const atual = totais.get(linha.chave) ?? { nome: linha.chave, minutos: 0, execucoes: 0 };
    atual.minutos += linha.minutos;
    atual.execucoes += 1;
    totais.set(linha.chave, atual);
  }
  return [...totais.values()].sort((a, b) => b.minutos - a.minutos || a.nome.localeCompare(b.nome));
}

/**
 * O relatório de execuções de um projeto num período, só para o gestor, pela `RelatorioService` (a mesma do dialog de relatório).
 * Devolve só totais por pessoa e por atividade, nunca as linhas: a IA responde "quanto o projeto consumiu" sem estourar o contexto.
 */
@Injectable()
export class ConsultarRelatorioDeExecucoesFerramenta extends FerramentaIa<RelatorioDeExecucoesConsultarDto> {
  readonly nome = 'consultar_relatorio_de_execucoes';
  readonly descricao =
    'Resume o tempo executado num projeto (`projetoId` de listar_projetos) num período: o total, o que cada pessoa fez e as atividades com mais tempo. ' +
    'Informe `dataInicio` e `dataFim` (yyyy-mm-dd), ou `ano` e `mes`, ou só `ano`. Use para "quanto o projeto X consumiu em setembro?". Não gera arquivo.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = RelatorioDeExecucoesConsultarDto;

  constructor(private readonly relatorioService: RelatorioService) {
    super();
  }

  async executar(entrada: RelatorioDeExecucoesConsultarDto, _usuarioAtivo: JwtPayload): Promise<RelatorioDeExecucoesConsultadoDto> {
    const resposta = await this.relatorioService.gerarRelatorio({ ...this.resolverPeriodo(entrada), projetoId: entrada.projetoId });
    const relatorio = resposta.dados as RelatorioExecucaoDto;
    const porAtividade = somarPorChave(
      relatorio.linhas.map((linha) => ({ minutos: linha.duracaoMinutos, chave: `${linha.nomeDemanda} › ${linha.nomeAtividade}` })),
    );
    return {
      projeto: relatorio.nomeProjeto,
      periodo: relatorio.periodoDescricao,
      dataInicio: relatorio.dataInicio,
      dataFim: relatorio.dataFim,
      totalMinutos: relatorio.totalMinutos,
      totalExecucoes: relatorio.totalExecucoes,
      porUsuario: somarPorChave(relatorio.linhas.map((linha) => ({ minutos: linha.duracaoMinutos, chave: linha.nomeUsuario }))),
      porAtividade: porAtividade.slice(0, LIMITE_ATIVIDADES_DO_RELATORIO),
      haMaisAtividades: porAtividade.length > LIMITE_ATIVIDADES_DO_RELATORIO,
    };
  }

  /** Traduz o que o modelo informou para o período da service (a validação de campos faltando é dela). */
  private resolverPeriodo(entrada: RelatorioDeExecucoesConsultarDto) {
    if (entrada.dataInicio && entrada.dataFim) {
      return { periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: entrada.dataInicio, dataFim: entrada.dataFim };
    }
    if (entrada.mes !== undefined) return { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: entrada.ano, mes: entrada.mes };
    return { periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: entrada.ano };
  }
}
