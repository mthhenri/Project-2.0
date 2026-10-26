import { Injectable } from '@nestjs/common';
import { DemandaChecklistConsultadoDto, DemandaChecklistConsultarDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaService } from '../../demanda/services/demanda.service';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { AtividadeService } from '../services/atividade.service';

/** Quantas atividades do checklist voltam de uma vez à IA. */
export const LIMITE_ATIVIDADES_DO_CHECKLIST = 30;

/**
 * O checklist de uma demanda (task 242): as atividades como blocos do trabalho, de todos os donos, para a IA decidir entre reutilizar um
 * bloco, marcá-lo desenvolvido ou criar o que falta. Enxuta de propósito: não devolve as descrições da demanda (a do cliente é do gestor).
 * Vale onde o usuário pode criar atividade: o gestor em qualquer demanda, o desenvolvedor nas atribuídas a ele.
 */
@Injectable()
export class ConsultarChecklistDaDemandaFerramenta extends FerramentaIa<DemandaChecklistConsultarDto> {
  readonly nome = 'consultar_checklist_da_demanda';
  readonly descricao =
    'Consulta o checklist de uma demanda: as atividades (blocos do trabalho) com nome, status, dono, tempo executado, quantidade de execuções e qual está em execução agora. ' +
    'Use ANTES de propor criar uma atividade, para reaproveitar o bloco que já serve, e para achar o bloco que o relato mostra como desenvolvido. ' +
    'O demandaId vem de listar_minhas_demandas ou de listar_minhas_atividades.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = DemandaChecklistConsultarDto;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly atividadeService: AtividadeService,
  ) {
    super();
  }

  async executar(entrada: DemandaChecklistConsultarDto, usuarioAtivo: JwtPayload): Promise<DemandaChecklistConsultadoDto> {
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new BusinessException('Demanda não encontrada');
    // `podeEditar` é verdadeiro para o gestor e para o membro da demanda: a regra de quem cria atividade. Quem só enxerga a demanda não lê o checklist.
    if (!demanda.podeEditar) throw new BusinessException('Você não tem acesso ao checklist desta demanda.');

    const resposta = await this.atividadeService.listar({ demandaId: entrada.demandaId, itensPorPagina: LIMITE_ATIVIDADES_DO_CHECKLIST }, usuarioAtivo);
    const { itens, totalItens } = resposta.dados ?? { itens: [], totalItens: 0 };
    return {
      demandaId: demanda.id,
      demanda: demanda.nome,
      atividades: itens.map((atividade) => ({
        id: atividade.id,
        nome: atividade.nome,
        status: atividade.status,
        usuario: atividade.nomeUsuario,
        minutosExecutados: atividade.totalMinutosExecutados,
        totalExecucoes: atividade.totalExecucoes,
        emExecucao: atividade.execucaoAtivaId !== null,
      })),
      total: totalItens,
      haMais: totalItens > itens.length,
    };
  }
}
