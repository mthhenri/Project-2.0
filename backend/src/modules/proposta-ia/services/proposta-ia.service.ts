import { Injectable } from '@nestjs/common';
import {
  PropostaIaAjustadaDto,
  PropostaIaAjustarDto,
  PropostaIaConfirmadaDto,
  PropostaIaCriarDto,
  PropostaIaDesfeitaDto,
  PropostaIaRecuperadaDto,
  PropostaIaRecusadaDto,
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

  /** Só depois de confirmada (ou ajustada): aplica a ação inversa do executor. Se já não for seguro, a proposta continua como estava. */
  async desfazer(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<PropostaIaDesfeitaDto>> {
    const proposta = await this.obterDoUsuario(id, usuarioAtivo);
    const situacaoAtual = proposta.status;
    if (situacaoAtual !== StatusPropostaIaEnum.CONFIRMADA && situacaoAtual !== StatusPropostaIaEnum.AJUSTADA) {
      throw new BusinessException('Só é possível desfazer uma proposta confirmada');
    }
    if (!proposta.resultado) throw new BusinessException('A ação desta proposta ainda está em andamento');

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
