import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AutorMensagemDiretaEnum,
  ConversaDiretaSupervisaoListadasDto,
  ConversaDiretaSupervisaoResumoDto,
  LIMITE_PADRAO_DA_CONVERSA_DIRETA,
  LIMITE_PADRAO_DA_SUPERVISAO_DIRETA,
  MensagemDiretaSupervisaoLerDto,
  MensagemDiretaSupervisaoListadasDto,
  MensagemDiretaSupervisaoListarDto,
  MensagemDiretaSupervisaoParticipanteDto,
  StandardResponse,
  TipoUsuarioEnum,
  UsuarioTipoListadoDto,
  lerConversaDiretaId,
  temPermissaoDeGestor,
} from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { conversaEhSupervisionavel, lerPeriodoDaBusca, montarTextoDoAvisoDeSupervisao } from '../domain/mensagem-direta-regras';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

interface AvisoDeSupervisaoPedido {
  usuarioAtivo: JwtPayload;
  conversaId: string;
  participantes: number[];
  agora: Date;
  supervisaoId: number;
}

/**
 * Supervisão do chat entre colaboradores (task 214): gestor e administrador leem, somente leitura, as conversas **entre desenvolvedores**. A
 * elegibilidade vem do tipo **atual** dos participantes, conferida na lista e de novo na leitura (a lista e a rota usam a mesma função pura).
 * Cada abertura grava a auditoria; o aviso aos participantes sai no máximo uma vez por leitor, conversa e dia. Ler não marca nada como lido.
 */
@Injectable()
export class MensagemDiretaSupervisaoService {
  private readonly logger = new Logger(MensagemDiretaSupervisaoService.name);

  constructor(
    @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
    private readonly supervisaoRepositorio: MensagemDiretaSupervisaoRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly eventosService: MensagemDiretaEventosService,
  ) {}

  async listarConversasSupervisionadas(
    dto: MensagemDiretaSupervisaoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<ConversaDiretaSupervisaoListadasDto>> {
    this.validarGestor(usuarioAtivo);
    const periodo = lerPeriodoDaBusca(dto.inicio, dto.fim);
    const pagina = dto.pagina ?? 1;
    const porPagina = dto.porPagina ?? LIMITE_PADRAO_DA_SUPERVISAO_DIRETA;

    const usuarioIdsExcluidos = await this.usuarioRepositorio.listarIdsComPermissaoDeGestor();
    const encontradas = await this.armazenamento.listarTodasConversas({
      usuarioIdsExcluidos,
      texto: dto.texto?.trim() || undefined,
      inicio: periodo.inicio,
      fim: periodo.fim,
      somenteCodigo: dto.somenteCodigo,
      pagina,
      porPagina,
    });

    const participantes = await this.montarParticipantes([...new Set(encontradas.conversas.flatMap((conversa) => conversa.participantes))]);
    const conversas: ConversaDiretaSupervisaoResumoDto[] = encontradas.conversas.map((conversa) => ({
      conversaId: conversa.conversaId,
      participantes: conversa.participantes.map((usuarioId) => participantes.get(usuarioId) ?? this.participanteRemovido(usuarioId)),
      totalMensagens: conversa.totalMensagens,
      ultimaMensagem: conversa.ultimaMensagem,
    }));

    return { sucesso: true, dados: { conversas, total: encontradas.total, pagina, porPagina }, mensagem: 'Conversas listadas com sucesso' };
  }

  async lerConversaSupervisionada(
    dto: MensagemDiretaSupervisaoLerDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<MensagemDiretaSupervisaoListadasDto>> {
    this.validarGestor(usuarioAtivo);
    const ids = lerConversaDiretaId(dto.conversaId);
    if (!ids) throw new ResourceNotFoundException('Conversa');

    // A própria conversa do gestor não é supervisão: segue o caminho normal, sem auditoria nem aviso.
    if (ids.usuarioMenorId === usuarioAtivo.sub || ids.usuarioMaiorId === usuarioAtivo.sub) {
      throw new UnauthorizedAccessException('Esta é uma conversa sua: abra-a pelo chat');
    }

    const encontrados = await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: [ids.usuarioMenorId, ids.usuarioMaiorId] });
    if (encontrados.length !== 2) throw new ResourceNotFoundException('Conversa');
    if (!conversaEhSupervisionavel(encontrados.map((usuario) => usuario.tipo))) {
      throw new UnauthorizedAccessException('Esta conversa envolve um gestor ou administrador e é privada');
    }

    // Abrir a conversa é a primeira página; as mais antigas (com cursor) continuam a mesma abertura e não geram nova auditoria nem novo aviso.
    let avisou = false;
    if (!dto.cursor) {
      const auditoria = await this.supervisaoRepositorio.registrarLeitura({
        leitorUsuarioId: usuarioAtivo.sub,
        conversaId: dto.conversaId,
        usuarioMenorId: ids.usuarioMenorId,
        usuarioMaiorId: ids.usuarioMaiorId,
      });
      avisou = await this.avisarParticipantes({
        usuarioAtivo,
        conversaId: dto.conversaId,
        participantes: [ids.usuarioMenorId, ids.usuarioMaiorId],
        agora: new Date(),
        supervisaoId: auditoria.id,
      });
    }

    const pagina = await this.armazenamento.listarConversa({
      conversaId: dto.conversaId,
      cursor: dto.cursor,
      limite: dto.limite ?? LIMITE_PADRAO_DA_CONVERSA_DIRETA,
    });

    return {
      sucesso: true,
      dados: {
        conversaId: dto.conversaId,
        participantes: encontrados.map((usuario) => this.paraParticipante(usuario)).sort((a, b) => a.usuarioId - b.usuarioId),
        mensagens: pagina.mensagens,
        proximoCursor: pagina.proximoCursor,
        participantesAvisados: avisou,
      },
      mensagem: 'Conversa recuperada com sucesso',
    };
  }

  /**
   * Grava a mensagem do sistema que avisa a leitura, se este leitor ainda não avisou esta conversa hoje, e a publica aos participantes. Qualquer falha
   * aqui **não** falha a leitura: a auditoria já foi gravada e só vira "avisada" depois que a mensagem existe, então a próxima abertura do dia tenta de novo.
   */
  private async avisarParticipantes(pedido: AvisoDeSupervisaoPedido): Promise<boolean> {
    const { usuarioAtivo, conversaId, participantes, agora, supervisaoId } = pedido;
    try {
      if (await this.supervisaoRepositorio.existeAvisoDoDia({ leitorUsuarioId: usuarioAtivo.sub, conversaId, agora })) return false;
      const leitor = (await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: [usuarioAtivo.sub] }))[0];
      const gravada = await this.armazenamento.gravar({
        mensagemId: randomUUID(),
        conversaId,
        autor: AutorMensagemDiretaEnum.SISTEMA,
        autorUsuarioId: null,
        texto: montarTextoDoAvisoDeSupervisao(leitor?.nomeCompleto ?? 'Um gestor', leitor?.tipo ?? usuarioAtivo.tipo),
        contemCodigo: false,
        mencoes: [],
        referencias: [],
      });
      await this.supervisaoRepositorio.marcarAvisoDado({ supervisaoId });
      // A mensagem já existe: se o stream falhar, os participantes a leem ao reconectar e o aviso conta como dado.
      await this.eventosService.publicarParaUsuarios({ usuarioIds: participantes, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } }).catch((erro: unknown) => {
        this.logger.warn(`Não foi possível publicar o aviso da conversa ${conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
      });
      return true;
    } catch (erro) {
      this.logger.warn(`Não foi possível avisar os participantes da conversa ${conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
      return false;
    }
  }

  private validarGestor(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Apenas gestores podem supervisionar conversas');
  }

  private async montarParticipantes(usuarioIds: number[]): Promise<Map<number, MensagemDiretaSupervisaoParticipanteDto>> {
    const encontrados = await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds });
    return new Map(encontrados.map((usuario) => [usuario.id, this.paraParticipante(usuario)]));
  }

  private paraParticipante(usuario: UsuarioTipoListadoDto): MensagemDiretaSupervisaoParticipanteDto {
    return { usuarioId: usuario.id, usuarioNome: usuario.nomeCompleto, tipo: usuario.tipo };
  }

  private participanteRemovido(usuarioId: number): MensagemDiretaSupervisaoParticipanteDto {
    return { usuarioId, usuarioNome: NOME_DE_USUARIO_REMOVIDO, tipo: TipoUsuarioEnum.DESENVOLVEDOR };
  }
}
