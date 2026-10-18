import { Injectable } from '@nestjs/common';
import { ProporAlterarDemandaDto, PropostaAlterarDemandaDadosDto, TipoDemandaStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { validarNovoPaiDaDemanda } from '../domain/novo-pai-da-demanda';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';

/**
 * Propõe alterar o nome, o status, as horas estimadas, a previsão de término, acrescentar documentação ou mudar o pai de uma demanda (o
 * gestor, ou o desenvolvedor membro dela: a service confere); **não altera nada** (só o clique de Confirmar no cartão altera). Lê a demanda com o usuário do token, descarta o que já está igual e guarda os valores de antes
 * para o cartão e para o desfazer. Ao concluir, conta as atividades ainda abertas para o cartão avisar (a regra de hoje não bloqueia).
 */
@Injectable()
export class ProporAlterarDemandaFerramenta extends FerramentaPropostaIa<ProporAlterarDemandaDto> {
  readonly nome = 'propor_alterar_demanda';
  readonly descricao =
    'Propõe alterar UMA demanda existente: `nome`, `status` (PENDENTE, PLANEJADA, CONCLUIDA ou CANCELADA), `horasEstimadas` (horas inteiras), `previsaoFimData` (yyyy-mm-dd), `acrescentarDocumentacao` (Markdown ACRESCENTADO ao fim da documentação, nunca substitui) e/ou `demandaPaiId` (mover para dentro de outra demanda ESTRUTURAL do mesmo projeto; não move para o topo e recusa mover para dentro de uma filha). ' +
    'Informe só o que muda. Use para "conclui a demanda X", "muda a previsão da Y para 30/11", "reestima a Z em 20 horas", "anota na documentação da W…" ou "move a X para dentro da Y". Nada muda até o usuário confirmar no cartão. ' +
    'O demandaId vem de listar_demandas_do_projeto. Resolva datas relativas com consultar_data_e_hora. Para descrições use propor_descrever_demanda; para mover de lugar na árvore, as conexões e o lugar.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporAlterarDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.ALTERAR_DEMANDA;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly projetoService: ProjetoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAlterarDemandaDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    // `recuperar` confere a existência e o acesso do usuário à demanda: erro aqui volta ao modelo, e nenhuma proposta nasce.
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new BusinessException('Demanda não encontrada');

    const previsaoAtual = demanda.previsaoFimData ? String(demanda.previsaoFimData).slice(0, 10) : null;
    const muda = {
      nome: entrada.nome !== undefined && entrada.nome !== demanda.nome,
      status: entrada.status !== undefined && entrada.status !== demanda.status,
      horas: entrada.horasEstimadas !== undefined && entrada.horasEstimadas !== demanda.horasEstimadas,
      previsao: entrada.previsaoFimData !== undefined && entrada.previsaoFimData !== previsaoAtual,
    };
    if (entrada.nome !== undefined && entrada.nome.trim() === '') throw new BusinessException('O nome da demanda não pode ficar vazio');
    const documentacaoAcrescentada = entrada.acrescentarDocumentacao?.trim() ?? '';
    const mudaPai = entrada.demandaPaiId !== undefined && entrada.demandaPaiId !== demanda.demandaPaiId;
    if (!muda.nome && !muda.status && !muda.horas && !muda.previsao && !documentacaoAcrescentada && !mudaPai) {
      throw new BusinessException(`A demanda "${demanda.nome}" já está assim: não há o que alterar. Avise o usuário.`);
    }

    // Mover: o novo pai é lido com o usuário do token (existência e acesso) e conferido contra ciclo, projeto e estrutura.
    let paiNovoNome: string | undefined;
    let paiAnteriorNome: string | null = null;
    if (mudaPai) {
      const novoPai = (await this.demandaService.recuperar({ id: entrada.demandaPaiId as number }, usuarioAtivo)).dados;
      if (!novoPai) throw new BusinessException('Demanda pai não encontrada');
      const subarvore = (await this.demandaRepositorio.listarDescendentes({ demandaId: demanda.id })).map((item) => item.id);
      validarNovoPaiDaDemanda({ demandaId: demanda.id, demandaProjetoId: demanda.projetoId, novoPai, idsDaSubarvore: subarvore });
      paiNovoNome = novoPai.nome;
      if (demanda.demandaPaiId) paiAnteriorNome = (await this.demandaService.recuperar({ id: demanda.demandaPaiId }, usuarioAtivo)).dados?.nome ?? null;
    }

    const projeto = (await this.projetoService.recuperar({ id: demanda.projetoId }, usuarioAtivo)).dados;
    const atividadesEmAberto =
      muda.status && entrada.status === TipoDemandaStatusEnum.CONCLUIDA ? await this.demandaRepositorio.contarAtividadesEmAberto({ id: demanda.id }) : 0;

    const dados: PropostaAlterarDemandaDadosDto = {
      demandaId: demanda.id,
      demandaNome: demanda.nome,
      projetoNome: projeto?.nome,
      ...(muda.nome ? { nome: entrada.nome } : {}),
      ...(muda.status ? { status: entrada.status, statusAnterior: demanda.status } : {}),
      ...(muda.horas ? { horasEstimadas: entrada.horasEstimadas, horasAnteriores: demanda.horasEstimadas } : {}),
      ...(muda.previsao ? { previsaoFimData: entrada.previsaoFimData, previsaoAnteriorData: previsaoAtual } : {}),
      ...(documentacaoAcrescentada ? { acrescentarDocumentacao: documentacaoAcrescentada } : {}),
      ...(mudaPai ? { demandaPaiId: entrada.demandaPaiId, paiAnteriorNome, paiNovoNome } : {}),
      ...(atividadesEmAberto > 0 ? { atividadesEmAberto } : {}),
    };
    return { ...dados };
  }
}
