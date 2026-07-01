import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  RelatorioExecucaoConsultarDto,
  RelatorioExecucaoBaixarDto,
  RelatorioExecucaoDto,
  RelatorioRevisaoSolicitarDto,
  RelatorioRevisaoDto,
  RelatorioInconsistenciaDto,
  RelatorioPeriodoTipoEnum,
  RelatorioFormatoEnum,
} from '@project20/shared';
import { ExecucaoRepository } from '../../execucao/repositories/execucao.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { StandardResponse } from '../../../core/interfaces/standard-response.interface';

/** Período do relatório já resolvido em datas concretas (YYYY-MM-DD) + rótulo legível. */
interface PeriodoResolvido {
  dataInicio: string;
  dataFim: string;
  periodoDescricao: string;
}

/** Colunas do arquivo exportado, na ordem definida. Início/fim são data + hora completas
 *  (a execução pode virar o dia), por isso não há coluna "Data" separada. */
const COLUNAS_RELATORIO = [
  'Projeto',
  'Demanda',
  'Atividade',
  'Usuário',
  'Data Início',
  'Data Fim',
  'Tempo (h)',
  'Descrição',
] as const;

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Limite simples de linhas enviadas à IA (refinamento de chunking é follow-up). */
const LIMITE_LINHAS_IA = 200;

@Injectable()
export class RelatorioService {
  private readonly clienteAnthropic: Anthropic | null;

  constructor(
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly projetoRepositorio: ProjetoRepository,
    private readonly configService: ConfigService,
  ) {
    const apiKey = configService.obter().anthropic.apiKey;
    this.clienteAnthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  /**
   * Gera os dados do relatório de execuções de um projeto no período (preview e base da revisão).
   * Acesso gestor-only garantido pelo `@GestorOnly()` na controller — sem filtro por usuário.
   */
  async gerarRelatorio(
    dto: RelatorioExecucaoConsultarDto & { projetoId: number },
  ): Promise<StandardResponse<RelatorioExecucaoDto>> {
    const { relatorio } = await this.montarRelatorio(dto);
    return { sucesso: true, dados: relatorio, mensagem: 'Relatório gerado com sucesso' };
  }

  /**
   * Monta o arquivo do relatório para download (CSV/XLSX). Devolve o conteúdo binário e os
   * metadados; a controller apenas seta os headers HTTP a partir do retorno.
   */
  async baixarRelatorio(
    dto: RelatorioExecucaoBaixarDto & { projetoId: number },
  ): Promise<{ conteudo: Buffer; nomeArquivo: string; mimeType: string }> {
    const { relatorio, codigoProjeto } = await this.montarRelatorio(dto);

    // XLSX é groundwork: sem a dependência `exceljs` nesta task, o formato não está disponível.
    if (dto.formato === RelatorioFormatoEnum.XLSX) {
      throw new BusinessException('Formato XLSX ainda não disponível');
    }

    const conteudo = this.montarCsv(relatorio);
    const nomeArquivo = `relatorio-execucoes_${codigoProjeto}_${relatorio.dataInicio}_${relatorio.dataFim}.csv`;
    return { conteudo, nomeArquivo, mimeType: 'text/csv; charset=utf-8' };
  }

  /**
   * Groundwork — revisão do relatório por IA (Anthropic) apontando inconsistências.
   * Monta um prompt a partir das linhas do período e faz parse defensivo do JSON retornado.
   */
  async revisarRelatorio(
    dto: RelatorioRevisaoSolicitarDto & { projetoId: number },
  ): Promise<StandardResponse<RelatorioRevisaoDto>> {
    if (!this.clienteAnthropic) {
      throw new BusinessException('Recurso de IA não está configurado neste ambiente');
    }

    const { relatorio } = await this.montarRelatorio(dto);
    const configuracao = this.configService.obter().anthropic;
    const prompt = this.montarPromptRevisao(relatorio);

    try {
      const resposta = await this.clienteAnthropic.messages.create({
        model:      configuracao.modelo,
        max_tokens: configuracao.maximoTokens,
        messages:   [{ role: 'user', content: prompt }],
      });

      const textoResposta = resposta.content
        .filter((bloco) => bloco.type === 'text')
        .map((bloco) => (bloco as { type: 'text'; text: string }).text)
        .join('');

      const revisao = this.parsearRevisao(textoResposta);
      return { sucesso: true, dados: revisao, mensagem: 'Revisão do relatório concluída' };
    } catch {
      throw new BusinessException('Serviço de IA temporariamente indisponível');
    }
  }

  /**
   * Resolve o período, recupera o projeto e busca as linhas do relatório.
   * Reutilizado por gerar, baixar e revisar (mesmo acesso e mesmos dados).
   */
  private async montarRelatorio(
    dto: RelatorioExecucaoConsultarDto & { projetoId: number },
  ): Promise<{ relatorio: RelatorioExecucaoDto; codigoProjeto: string }> {
    const periodo = this.validarEResolverPeriodo(dto);

    const projeto = await this.projetoRepositorio.recuperar({ id: dto.projetoId });
    if (!projeto) {
      throw new ResourceNotFoundException('Projeto');
    }

    const linhas = await this.execucaoRepositorio.listarParaRelatorio({
      projetoId:  dto.projetoId,
      dataInicio: periodo.dataInicio,
      dataFim:    periodo.dataFim,
    });

    const totalExecucoes = linhas.length;
    const totalMinutos = linhas.reduce((soma, linha) => soma + (linha.duracaoMinutos ?? 0), 0);

    const relatorio: RelatorioExecucaoDto = {
      projetoId:        projeto.id,
      nomeProjeto:      projeto.nome,
      periodoTipo:      dto.periodoTipo,
      periodoDescricao: periodo.periodoDescricao,
      dataInicio:       periodo.dataInicio,
      dataFim:          periodo.dataFim,
      totalExecucoes,
      totalMinutos,
      linhas,
    };

    return { relatorio, codigoProjeto: projeto.codigo };
  }

  /**
   * Valida os campos exigidos pelo tipo de período e resolve o intervalo em datas concretas.
   * Defesa em profundidade além do `@ValidateIf` dos DTOs de entrada.
   */
  private validarEResolverPeriodo(dto: {
    periodoTipo: RelatorioPeriodoTipoEnum;
    ano?: number;
    mes?: number;
    dataInicio?: string;
    dataFim?: string;
  }): PeriodoResolvido {
    if (dto.periodoTipo === RelatorioPeriodoTipoEnum.ANUAL) {
      if (dto.ano === undefined) {
        throw new BusinessException('Ano é obrigatório para relatório anual');
      }
      return {
        dataInicio:       `${dto.ano}-01-01`,
        dataFim:          `${dto.ano}-12-31`,
        periodoDescricao: `Ano ${dto.ano}`,
      };
    }

    if (dto.periodoTipo === RelatorioPeriodoTipoEnum.MENSAL) {
      if (dto.ano === undefined || dto.mes === undefined) {
        throw new BusinessException('Ano e mês são obrigatórios para relatório mensal');
      }
      const mesFormatado = String(dto.mes).padStart(2, '0');
      const ultimoDia = new Date(dto.ano, dto.mes, 0).getDate();
      return {
        dataInicio:       `${dto.ano}-${mesFormatado}-01`,
        dataFim:          `${dto.ano}-${mesFormatado}-${String(ultimoDia).padStart(2, '0')}`,
        periodoDescricao: `${NOMES_MESES[dto.mes - 1]}/${dto.ano}`,
      };
    }

    // CUSTOM
    if (!dto.dataInicio || !dto.dataFim) {
      throw new BusinessException('Data de início e data de fim são obrigatórias para período personalizado');
    }
    if (dto.dataFim < dto.dataInicio) {
      throw new BusinessException('A data de fim deve ser maior ou igual à data de início');
    }
    return {
      dataInicio:       dto.dataInicio,
      dataFim:          dto.dataFim,
      periodoDescricao: `${this.formatarDataBrasileira(dto.dataInicio)} a ${this.formatarDataBrasileira(dto.dataFim)}`,
    };
  }

  /** Serializa o relatório em CSV (BOM UTF-8, separador vírgula, quebra CRLF, campos escapados). */
  private montarCsv(relatorio: RelatorioExecucaoDto): Buffer {
    const linhasArquivo = relatorio.linhas.map((linha) => [
      linha.nomeProjeto,
      linha.nomeDemanda,
      linha.nomeAtividade,
      linha.nomeUsuario,
      this.forcarTextoPlanilha(this.formatarDataHora(linha.inicioData)),
      this.forcarTextoPlanilha(this.formatarDataHora(linha.fimData)),
      this.formatarDuracao(linha.duracaoMinutos),
      linha.descricao,
    ]);

    const conteudo = [COLUNAS_RELATORIO, ...linhasArquivo]
      .map((colunas) => colunas.map((valor) => this.escaparCampoCsv(String(valor ?? ''))).join(','))
      .join('\r\n');

    // BOM UTF-8 (U+FEFF) para o Excel abrir os acentos corretamente.
    const bom = String.fromCharCode(0xfeff);
    return Buffer.from(bom + conteudo, 'utf-8');
  }

  /** Envolve em aspas duplas e duplica aspas internas quando o campo contém vírgula/aspas/quebra. */
  private escaparCampoCsv(valor: string): string {
    if (/[",\r\n]/.test(valor)) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }

  /** Converte "YYYY-MM-DD" em "DD/MM/YYYY". */
  private formatarDataBrasileira(dataIso: string): string {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  /** Formata o instante em "DD/MM/YYYY HH:MM" no fuso da aplicação; vazio quando nulo
   *  (em andamento). Data + hora completas porque a execução pode virar o dia. */
  private formatarDataHora(data: Date | string | null): string {
    if (!data) return '';
    const instante = data instanceof Date ? data : new Date(data);
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone:  this.configService.obter().aplicacao.fusoHorario,
      day:       '2-digit',
      month:     '2-digit',
      year:      'numeric',
      hour:      '2-digit',
      minute:    '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instante);
    const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
    return `${valor('day')}/${valor('month')}/${valor('year')} ${valor('hour')}:${valor('minute')}`;
  }

  /**
   * Envolve o valor num "formula-string" do Excel (`="..."`) para forçá-lo a TEXTO na planilha.
   * Sem isso o Excel reconhece "DD/MM/YYYY HH:MM" como data-hora e, na meia-noite (00:00),
   * exibe só a data — "comendo" a hora. Vazio permanece vazio (execução em andamento).
   */
  private forcarTextoPlanilha(valor: string): string {
    return valor ? `="${valor}"` : '';
  }

  /** Converte minutos em "HH:MM". */
  private formatarDuracao(minutos: number): string {
    const totalMinutos = Math.max(0, Math.round(minutos ?? 0));
    const horas = Math.floor(totalMinutos / 60);
    const restante = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(restante).padStart(2, '0')}`;
  }

  /** Monta o prompt de revisão a partir de uma amostra limitada das linhas + agregados. */
  private montarPromptRevisao(relatorio: RelatorioExecucaoDto): string {
    const linhasEnviadas = relatorio.linhas.slice(0, LIMITE_LINHAS_IA);
    const linhasTexto = linhasEnviadas
      .map((linha, indice) => {
        const descricao = (linha.descricao ?? '').replace(/\s+/g, ' ').trim();
        return `${indice + 1}. [${linha.dataExecucao}] ${linha.nomeDemanda} / ${linha.nomeAtividade} — ${linha.nomeUsuario} — ${linha.duracaoMinutos} min — status ${linha.statusAtividade} — "${descricao}"`;
      })
      .join('\n');

    const nota = relatorio.totalExecucoes > linhasEnviadas.length
      ? ` (amostra de ${linhasEnviadas.length} de ${relatorio.totalExecucoes} execuções — restante truncado)`
      : '';

    return `Você é um auditor que revisa relatórios de apontamento de horas de desenvolvedores em busca de inconsistências.

Projeto: ${relatorio.nomeProjeto}
Período: ${relatorio.periodoDescricao}
Total de execuções: ${relatorio.totalExecucoes}
Total de minutos: ${relatorio.totalMinutos}
Linhas analisadas: ${linhasEnviadas.length}${nota}

Execuções:
${linhasTexto}

Aponte possíveis inconsistências, como: descrições vazias, vagas ou genéricas; durações desproporcionais à atividade; execuções concentradas fora do horário usual; possíveis sobreposições de horário; descrição que não condiz com o nome da atividade/demanda.

Responda EXCLUSIVAMENTE com um JSON válido, sem texto antes ou depois, no formato:
{"resumo": "string", "inconsistencias": [{"tipo": "string", "severidade": "BAIXA|MEDIA|ALTA", "descricao": "string", "referencia": "string ou null"}]}`;
  }

  /** Parse defensivo do JSON da IA para `RelatorioRevisaoDto`; lança em resposta irreconhecível. */
  private parsearRevisao(texto: string): RelatorioRevisaoDto {
    const inicio = texto.indexOf('{');
    const fim = texto.lastIndexOf('}');
    if (inicio === -1 || fim === -1 || fim < inicio) {
      throw new Error('Resposta da IA sem JSON reconhecível');
    }

    const bruto = JSON.parse(texto.slice(inicio, fim + 1)) as {
      resumo?: unknown;
      inconsistencias?: unknown;
    };

    const inconsistencias: RelatorioInconsistenciaDto[] = Array.isArray(bruto.inconsistencias)
      ? bruto.inconsistencias.map((item) => {
          const registro = (item ?? {}) as Record<string, unknown>;
          return {
            tipo:       String(registro.tipo ?? ''),
            severidade: String(registro.severidade ?? ''),
            descricao:  String(registro.descricao ?? ''),
            referencia: registro.referencia == null ? null : String(registro.referencia),
          };
        })
      : [];

    return { resumo: String(bruto.resumo ?? ''), inconsistencias };
  }
}
