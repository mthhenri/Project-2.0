import { HttpException, Injectable, Logger } from '@nestjs/common';
import {
  PropostaIaAjustadaDto,
  PropostaIaAjustarDto,
  PropostaIaConfirmadaDto,
  PropostaIaCriarDto,
  PropostaIaDesfeitaDto,
  PropostaIaGrupoConfirmadoDto,
  PropostaIaGrupoConfirmarDto,
  PropostaIaGrupoDesfazerDto,
  PropostaIaGrupoDesfeitoDto,
  PropostaIaGrupoItemDto,
  PropostaIaGrupoRecusadoDto,
  PropostaIaGrupoRecusarDto,
  PropostaIaGrupoSituacaoEnum,
  idsDasPropostasDeQueDepende,
  PropostaIaRecuperadaDto,
  PropostaIaRecusadaDto,
  podeDesfazerProposta,
  PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS,
  PropostaIaResumoDto,
  StandardResponse,
  StatusPropostaIaEnum,
} from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { dataNoFuso } from '../../chat/domain/chat-conversa';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIaRegistro } from '../domain/executor-proposta-ia';
import { PropostaIaRepository } from '../repositories/proposta-ia.repository';

/**
 * Propostas da IA (task 136): a IA propõe, o usuário resolve. **Nada roda sem confirmação**, e a confirmação roda uma única vez: a
 * troca de situação é um comparar-e-trocar no SQL (só `PENDENTE` passa) feito **antes** do executor. Se o executor falha, a proposta
 * volta a `PENDENTE` (compensação) e o usuário vê o motivo. Só o dono resolve a proposta, nem o administrador resolve a de outro.
 */
@Injectable()
export class PropostaIaService {
  private readonly logger = new Logger(PropostaIaService.name);

  constructor(
    private readonly propostaIaRepositorio: PropostaIaRepository,
    private readonly executores: ExecutorPropostaIaRegistro,
    private readonly configService: ConfigService,
  ) {}

  /** Uso interno (ferramentas da IA): não há rota para criar. O tipo precisa ter executor e os dados precisam servir a ele. */
  async criar(dto: PropostaIaCriarDto): Promise<PropostaIaResumoDto> {
    const executor = this.executores.obter(dto.tipo);
    executor.validar(dto.dados);
    return this.propostaIaRepositorio.criar(dto);
  }

  async recuperarPorId(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaRecuperadaDto>> {
    const proposta = await this.obterDoUsuario(id, usuarioAtivo);
    return { sucesso: true, dados: proposta, mensagem: 'Proposta recuperada com sucesso' };
  }

  async confirmar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaConfirmadaDto>> {
    const proposta = await this.obterDoUsuario(id, usuarioAtivo);
    const resolvida = await this.resolver(proposta, proposta.dados, StatusPropostaIaEnum.CONFIRMADA, usuarioAtivo);
    return { sucesso: true, dados: resolvida, mensagem: 'Proposta confirmada com sucesso' };
  }

  async ajustar(id: number, dto: PropostaIaAjustarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaAjustadaDto>> {
    const proposta = await this.obterDoUsuario(id, usuarioAtivo);
    const resolvida = await this.resolver(proposta, dto.dados, StatusPropostaIaEnum.AJUSTADA, usuarioAtivo);
    return { sucesso: true, dados: resolvida, mensagem: 'Proposta ajustada e confirmada com sucesso' };
  }

  /**
   * Expira as propostas pendentes do usuário que ficaram obsoletas (o executor do tipo diz, por `estaObsoleta`). Usado na volta da IA
   * depois de uma queda: o usuário pode ter feito à mão o que a proposta pedia. Devolve quantas expiraram; falha em uma não impede as outras.
   */
  async expirarObsoletas(usuarioAtivo: JwtPayload): Promise<number> {
    let expiradas = 0;
    for (const proposta of await this.propostaIaRepositorio.listarPendentesDoUsuario(usuarioAtivo.sub)) {
      try {
        const executor = this.executores.obter(proposta.tipo);
        if (!executor.estaObsoleta || !(await executor.estaObsoleta(proposta.dados, usuarioAtivo))) continue;
        const expirada = await this.propostaIaRepositorio.transitar({ id: proposta.id, usuarioId: usuarioAtivo.sub, de: [StatusPropostaIaEnum.PENDENTE], para: StatusPropostaIaEnum.EXPIRADA });
        if (expirada) expiradas++;
      } catch {
        // uma proposta que não dá para avaliar fica como está
      }
    }
    return expiradas;
  }

  /** Recusar não executa nada: a proposta vira `EXPIRADA`. */
  async recusar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaRecusadaDto>> {
    await this.obterDoUsuario(id, usuarioAtivo);
    const recusada = await this.propostaIaRepositorio.transitar({
      id,
      usuarioId: usuarioAtivo.sub,
      de: [StatusPropostaIaEnum.PENDENTE],
      para: StatusPropostaIaEnum.EXPIRADA,
    });
    if (!recusada) throw new ConflictException('A proposta já foi resolvida');
    return { sucesso: true, dados: recusada, mensagem: 'Proposta recusada com sucesso' };
  }

  /** Só depois de confirmada (ou ajustada) e dentro do prazo (task 194): aplica a ação inversa do executor. Se já não for seguro, a proposta continua como estava. */
  async desfazer(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaDesfeitaDto>> {
    const proposta = await this.obterDoUsuario(id, usuarioAtivo);
    const situacaoAtual = proposta.status;
    if (situacaoAtual !== StatusPropostaIaEnum.CONFIRMADA && situacaoAtual !== StatusPropostaIaEnum.AJUSTADA) {
      throw new BusinessException('Só é possível desfazer uma proposta confirmada');
    }
    if (!proposta.resultado) throw new BusinessException('A ação desta proposta ainda está em andamento');
    if (!podeDesfazerProposta(proposta.resolucaoData)) {
      throw new BusinessException(`O prazo de ${PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS} minutos para desfazer esta proposta passou`);
    }

    const executor = this.executores.obter(proposta.tipo);
    const reivindicada = await this.propostaIaRepositorio.transitar({
      id,
      usuarioId: usuarioAtivo.sub,
      de: [situacaoAtual],
      para: StatusPropostaIaEnum.DESFEITA,
    });
    if (!reivindicada) throw new ConflictException('A proposta já foi desfeita');

    try {
      await executor.desfazer(proposta.resultado, usuarioAtivo);
    } catch (erro) {
      await this.propostaIaRepositorio.transitar({ id, usuarioId: usuarioAtivo.sub, de: [StatusPropostaIaEnum.DESFEITA], para: situacaoAtual });
      throw erro;
    }
    return { sucesso: true, dados: reivindicada, mensagem: 'Proposta desfeita com sucesso' };
  }

  /**
   * Confirma as propostas de um grupo numa chamada só (task 227), na ordem em que nasceram: quem referencia outra sempre vem depois dela. Cada
   * uma segue a confirmação de sempre (atômica, com o próprio desfazer). Uma que falha fica como estava e **as que dependem dela** (regra de
   * `idsDasPropostasDeQueDepende`) ficam pendentes com o motivo; as independentes seguem. Proposta que não é do usuário recusa o grupo todo
   * antes de executar qualquer uma.
   */
  async confirmarGrupo(dto: PropostaIaGrupoConfirmarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaGrupoConfirmadoDto>> {
    const propostas = await this.recuperarDoGrupo(dto.propostaIds, usuarioAtivo);
    const itens: PropostaIaGrupoItemDto[] = [];
    for (const proposta of propostas) {
      const impeditiva = idsDasPropostasDeQueDepende(proposta.tipo, proposta.dados)
        .map((id) => itens.find((item) => item.propostaId === id))
        .find((item) => item !== undefined && item.situacao !== PropostaIaGrupoSituacaoEnum.RESOLVIDA);
      if (impeditiva) {
        itens.push(await this.itemDoGrupo(proposta.id, PropostaIaGrupoSituacaoEnum.BLOQUEADA, 'Depende de uma proposta do grupo que não foi confirmada'));
        continue;
      }
      itens.push(await this.tentarNoGrupo(proposta.id, () => this.confirmar(proposta.id, usuarioAtivo)));
    }
    return { sucesso: true, dados: { itens }, mensagem: 'Propostas do grupo tratadas' };
  }

  /** Recusa as propostas do grupo (task 227); as que já não estavam pendentes ficam como estavam, com o motivo. Uma não impede as outras. */
  async recusarGrupo(dto: PropostaIaGrupoRecusarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaGrupoRecusadoDto>> {
    const propostas = await this.recuperarDoGrupo(dto.propostaIds, usuarioAtivo);
    const itens: PropostaIaGrupoItemDto[] = [];
    for (const proposta of propostas) {
      itens.push(await this.tentarNoGrupo(proposta.id, () => this.recusar(proposta.id, usuarioAtivo)));
    }
    return { sucesso: true, dados: { itens }, mensagem: 'Propostas do grupo tratadas' };
  }

  /**
   * Desfaz as propostas do grupo na **ordem inversa** (task 227): quem veio por último sai primeiro, para nunca desfazer uma de que outra
   * ainda depende. Para na primeira que recusar o desfazer (prazo, ou o estado mudou); as que sobram ficam como estavam, bloqueadas.
   */
  async desfazerGrupo(dto: PropostaIaGrupoDesfazerDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaGrupoDesfeitoDto>> {
    const propostas = (await this.recuperarDoGrupo(dto.propostaIds, usuarioAtivo)).reverse();
    const itens: PropostaIaGrupoItemDto[] = [];
    let motivoDaParada: string | null = null;
    for (const proposta of propostas) {
      if (motivoDaParada !== null) {
        itens.push(await this.itemDoGrupo(proposta.id, PropostaIaGrupoSituacaoEnum.BLOQUEADA, `Não foi desfeita: ${motivoDaParada}`));
        continue;
      }
      const item = await this.tentarNoGrupo(proposta.id, () => this.desfazer(proposta.id, usuarioAtivo));
      if (item.situacao === PropostaIaGrupoSituacaoEnum.FALHOU) motivoDaParada = item.motivo ?? 'a anterior não pôde ser desfeita';
      itens.push(item);
    }
    return { sucesso: true, dados: { itens }, mensagem: 'Propostas do grupo tratadas' };
  }

  /** As propostas do grupo em ordem crescente de id, todas do usuário (a primeira que não existir ou for de outro recusa o grupo). */
  private async recuperarDoGrupo(propostaIds: number[], usuarioAtivo: JwtPayload): Promise<PropostaIaResumoDto[]> {
    const propostas: PropostaIaResumoDto[] = [];
    for (const id of [...new Set(propostaIds)].sort((primeiro, segundo) => primeiro - segundo)) {
      propostas.push(await this.obterDoUsuario(id, usuarioAtivo));
    }
    return propostas;
  }

  /** Roda a ação de uma proposta do grupo; falha vira `FALHOU` com o motivo em vez de derrubar o grupo. */
  private async tentarNoGrupo(propostaId: number, acao: () => Promise<StandardResponse<PropostaIaResumoDto>>): Promise<PropostaIaGrupoItemDto> {
    try {
      const resposta = await acao();
      return { propostaId, situacao: PropostaIaGrupoSituacaoEnum.RESOLVIDA, motivo: null, proposta: resposta.dados ?? null };
    } catch (erro) {
      return this.itemDoGrupo(propostaId, PropostaIaGrupoSituacaoEnum.FALHOU, this.motivoDoErro(erro, propostaId));
    }
  }

  /** O item sem sucesso, com a proposta como ficou (a tela atualiza a linha). */
  private async itemDoGrupo(propostaId: number, situacao: PropostaIaGrupoSituacaoEnum, motivo: string): Promise<PropostaIaGrupoItemDto> {
    const proposta = (await this.propostaIaRepositorio.recuperarPorId(propostaId)) ?? null;
    return { propostaId, situacao, motivo, proposta };
  }

  /** O texto que a exceção mostra ao usuário (`mensagem` da resposta HTTP); erro de programação vira um aviso genérico e vai para o log. */
  private motivoDoErro(erro: unknown, propostaId: number): string {
    if (erro instanceof HttpException) {
      const resposta = erro.getResponse();
      if (typeof resposta === 'object' && resposta !== null && typeof (resposta as { mensagem?: unknown }).mensagem === 'string') {
        return (resposta as { mensagem: string }).mensagem;
      }
      return erro.message;
    }
    this.logger.error(`Falha inesperada na proposta ${propostaId} do grupo`, erro instanceof Error ? erro.stack : String(erro));
    return 'Não foi possível concluir esta proposta';
  }

  /** Valida, reivindica a proposta (só um chamador passa), executa e guarda o resultado; falha do executor devolve a `PENDENTE`. */
  private async resolver(
    proposta: PropostaIaResumoDto,
    dados: Record<string, unknown>,
    destino: StatusPropostaIaEnum.CONFIRMADA | StatusPropostaIaEnum.AJUSTADA,
    usuarioAtivo: JwtPayload,
  ): Promise<PropostaIaResumoDto> {
    const executor = this.executores.obter(proposta.tipo);
    executor.validar(dados);

    const reivindicada = await this.propostaIaRepositorio.transitar({
      id: proposta.id,
      usuarioId: usuarioAtivo.sub,
      de: [StatusPropostaIaEnum.PENDENTE],
      para: destino,
      dados: destino === StatusPropostaIaEnum.AJUSTADA ? dados : undefined,
    });
    if (!reivindicada) throw new ConflictException('A proposta já foi resolvida');

    try {
      const resultado = await executor.executar(reivindicada.dados, usuarioAtivo);
      return (await this.propostaIaRepositorio.registrarResultado(proposta.id, resultado)) as PropostaIaResumoDto;
    } catch (erro) {
      await this.propostaIaRepositorio.transitar({
        id: proposta.id,
        usuarioId: usuarioAtivo.sub,
        de: [destino],
        para: StatusPropostaIaEnum.PENDENTE,
      });
      throw erro;
    }
  }

  /** Proposta do usuário; uma `PENDENTE` de dia anterior vira `EXPIRADA` ao ser lida (sem job). */
  private async obterDoUsuario(id: number, usuarioAtivo: JwtPayload): Promise<PropostaIaResumoDto> {
    const proposta = await this.propostaIaRepositorio.recuperarPorId(id);
    if (!proposta) throw new ResourceNotFoundException('Proposta');
    if (proposta.usuarioId !== usuarioAtivo.sub) throw new UnauthorizedAccessException('Esta proposta é de outro usuário');

    if (proposta.status === StatusPropostaIaEnum.PENDENTE && this.ehDeDiaAnterior(proposta.createdDate)) {
      const expirada = await this.propostaIaRepositorio.transitar({
        id,
        usuarioId: usuarioAtivo.sub,
        de: [StatusPropostaIaEnum.PENDENTE],
        para: StatusPropostaIaEnum.EXPIRADA,
      });
      return expirada ?? ((await this.propostaIaRepositorio.recuperarPorId(id)) as PropostaIaResumoDto);
    }
    return proposta;
  }

  private ehDeDiaAnterior(criadaEm: Date): boolean {
    const fuso = this.configService.obter().aplicacao.fusoHorario;
    return dataNoFuso(new Date(criadaEm), fuso) !== dataNoFuso(new Date(), fuso);
  }
}
