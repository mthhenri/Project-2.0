import { Inject, Injectable } from '@nestjs/common';
import {
  AutorMensagemDiretaEnum,
  CitacaoMensagemDto,
  ConversaDiretaListadasDto,
  ConversaDiretaResumoDto,
  LIMITE_PADRAO_DA_CONVERSA_DIRETA,
  MensagemDiretaBuscadoDto,
  MensagemDiretaBuscarDto,
  MensagemDiretaDigitacaoAvisarDto,
  MensagemDiretaEnviadaDto,
  MensagemDiretaEnviarDto,
  MensagemDiretaLeituraAlteradaDto,
  MensagemDiretaLeituraAlterarDto,
  MensagemDiretaListadasDto,
  MensagemDiretaListarDto,
  MensagemDiretaPreferenciaAlteradaDto,
  MensagemDiretaPreferenciaAlterarDto,
  MensagemDiretaPessoasListadasDto,
  MensagemDiretaReferenciaBuscarDto,
  MensagemDiretaReferenciaRecuperadaDto,
  MensagemDiretaReferenciaRecuperarDto,
  MensagemDiretaReferenciaResumoDto,
  MensagemDiretaReferenciasBuscadasDto,
  MensagemDiretaPreferenciaRecuperadaDto,
  MensagemDiretaSilencioAlteradoDto,
  MensagemDiretaSilencioAlterarDto,
  PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA,
  ReferenciaMensagemDiretaEnum,
  ReferenciaMensagemDto,
  StandardResponse,
  TipoUsuarioEnum,
  TipoUsuarioStatusEnum,
  contemBlocoDeCodigo,
  montarConversaDiretaId,
  outroParticipanteDaConversaDireta,
  trechoDaMensagemDireta,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import {
  LIMITE_DE_SUGESTOES_DE_REFERENCIA,
  combinarSugestoesDeReferencia,
  lerPeriodoDaBusca,
  limitarLeituraAoAgora,
  normalizarMencoes,
  normalizarReferencias,
} from '../domain/mensagem-direta-regras';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { MensagemDiretaLeituraRepository } from '../repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaPreferenciaRepository } from '../repositories/mensagem-direta-preferencia.repository';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

/** O que o cartão mostra de uma referência a que **quem pergunta** tem acesso. */
type ReferenciaResolvida = Omit<MensagemDiretaReferenciaRecuperadaDto, 'tipo' | 'id' | 'acessivel'>;

/**
 * Chat entre colaboradores (task 208): conversa um a um entre quaisquer usuários. Toda regra e permissão mora aqui; o armazenamento das
 * mensagens (OpenSearch, Elasticsearch ou o Postgres provisório) recebe filtros explícitos e não conhece permissão.
 *
 * A pessoa que age é sempre a do token: remetente, dono do marcador de leitura, da preferência e do filtro da busca. O que chega pela rota
 * ou pelo corpo é só a **outra** pessoa da conversa. Supervisão (gestor lendo conversa de terceiros) é a task 214. Depois de gravar, a service avisa os streams pelo `MensagemDiretaEventosService` (task 209).
 */
@Injectable()
export class MensagemDiretaService {
  constructor(
    @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
    private readonly leituraRepositorio: MensagemDiretaLeituraRepository,
    private readonly preferenciaRepositorio: MensagemDiretaPreferenciaRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly atividadeRepositorio: AtividadeRepository,
    private readonly eventosService: MensagemDiretaEventosService,
  ) {}

  // ---------------------------------------------------------------------------
  // Enviar
  // ---------------------------------------------------------------------------

  async enviarMensagem(dto: MensagemDiretaEnviarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaEnviadaDto>> {
    await this.validarDestinatarioAtivo(dto.destinatarioId, usuarioAtivo);
    const conversaId = montarConversaDiretaId(usuarioAtivo.sub, dto.destinatarioId);
    const mencoes = normalizarMencoes(dto.mencoes, [usuarioAtivo.sub, dto.destinatarioId]);
    const referencias = normalizarReferencias(dto.referencias);
    for (const referencia of referencias) {
      await this.validarReferencia(referencia, usuarioAtivo);
    }
    const respondeA = await this.montarCitacao(dto.respondeAMensagemId, conversaId);

    const enviada = await this.armazenamento.gravar({
      mensagemId: dto.mensagemId.toLowerCase(),
      conversaId,
      autor: AutorMensagemDiretaEnum.USUARIO,
      autorUsuarioId: usuarioAtivo.sub,
      texto: dto.texto,
      contemCodigo: contemBlocoDeCodigo(dto.texto),
      mencoes,
      referencias,
      respondeA,
    });

    // O reenvio de uma mensagem que já estava gravada não avisa de novo. As duas pontas recebem (a do remetente cobre as outras abas dele).
    if (!enviada.jaExistia) {
      await this.eventosService.publicarParaUsuarios({ usuarioIds: [usuarioAtivo.sub, dto.destinatarioId], evento: { tipo: 'MENSAGEM', mensagem: enviada.mensagem } });
    }

    return {
      sucesso: true,
      dados: enviada,
      mensagem: enviada.jaExistia ? 'Mensagem já enviada' : 'Mensagem enviada com sucesso',
    };
  }

  // ---------------------------------------------------------------------------
  // Ler
  // ---------------------------------------------------------------------------

  async listarConversa(dto: MensagemDiretaListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaListadasDto>> {
    await this.validarOutraPessoa(dto.usuarioId, usuarioAtivo);
    const conversaId = montarConversaDiretaId(usuarioAtivo.sub, dto.usuarioId);

    const pagina = await this.armazenamento.listarConversa({
      conversaId,
      cursor: dto.cursor,
      limite: dto.limite ?? LIMITE_PADRAO_DA_CONVERSA_DIRETA,
    });
    const marcadorDoOutro = await this.leituraRepositorio.recuperarMarcador({ conversaId, usuarioId: dto.usuarioId });

    return {
      sucesso: true,
      dados: { mensagens: pagina.mensagens, proximoCursor: pagina.proximoCursor, lidaAteDate: marcadorDoOutro?.lidaAteDate ?? null },
      mensagem: 'Conversa recuperada com sucesso',
    };
  }

  async listarConversas(usuarioAtivo: JwtPayload): Promise<StandardResponse<ConversaDiretaListadasDto>> {
    const usuarioId = usuarioAtivo.sub;
    const resumos = await this.armazenamento.listarConversasDoUsuario({ usuarioId });
    if (resumos.length === 0) {
      return { sucesso: true, dados: { conversas: [] }, mensagem: 'Conversas listadas com sucesso' };
    }

    const marcadores = await this.leituraRepositorio.listarMarcadores({ usuarioId });
    const marcadorPorConversa = new Map(marcadores.map((marcador) => [marcador.conversaId, marcador]));
    const naoLidas = await this.armazenamento.contarNaoLidas({
      usuarioId,
      marcadores: resumos.map((resumo) => ({ conversaId: resumo.conversaId, lidaAteDate: marcadorPorConversa.get(resumo.conversaId)?.lidaAteDate ?? null })),
    });

    const outroPorConversa = new Map(resumos.map((resumo) => [resumo.conversaId, outroParticipanteDaConversaDireta(resumo.conversaId, usuarioId)]));
    const usuarioIds = [...new Set([...outroPorConversa.values()].filter((outroId): outroId is number => outroId !== null))];
    const nomes = new Map((await this.usuarioRepositorio.listarNomesPorIds({ usuarioIds })).map((usuario) => [usuario.id, usuario.nomeCompleto]));

    const online = this.eventosService.listarUsuariosOnline();
    const conversas: ConversaDiretaResumoDto[] = [];
    for (const resumo of resumos) {
      const outroId = outroPorConversa.get(resumo.conversaId);
      if (outroId === null || outroId === undefined) continue;
      conversas.push({
        conversaId: resumo.conversaId,
        usuarioId: outroId,
        usuarioNome: nomes.get(outroId) ?? NOME_DE_USUARIO_REMOVIDO,
        ultimaMensagem: resumo.ultimaMensagem,
        naoLidas: naoLidas[resumo.conversaId] ?? 0,
        silenciada: marcadorPorConversa.get(resumo.conversaId)?.silenciada ?? false,
        online: online.has(outroId),
      });
    }

    return { sucesso: true, dados: { conversas }, mensagem: 'Conversas listadas com sucesso' };
  }

  /** As pessoas ativas com quem se pode conversar (qualquer uma, menos quem pergunta), com a presença. O desenvolvedor não pode usar `GET /usuario`, que é do gestor. */
  async listarPessoas(usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaPessoasListadasDto>> {
    const online = this.eventosService.listarUsuariosOnline();
    const ativos = await this.usuarioRepositorio.listarAtivos();
    const pessoas = ativos
      .filter((usuario) => usuario.id !== usuarioAtivo.sub)
      .map((usuario) => ({ usuarioId: usuario.id, usuarioNome: usuario.nomeCompleto, tipo: usuario.tipo, online: online.has(usuario.id) }));
    return { sucesso: true, dados: { pessoas }, mensagem: 'Pessoas listadas com sucesso' };
  }

  /** As sugestões do `#`: demandas e atividades que **quem digita** pode referenciar, pelo nome (a mesma regra de acesso do envio). */
  async buscarReferencias(dto: MensagemDiretaReferenciaBuscarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaReferenciasBuscadasDto>> {
    const texto = dto.texto.trim();
    const usuarioId = usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR ? usuarioAtivo.sub : null;
    const limite = LIMITE_DE_SUGESTOES_DE_REFERENCIA;
    const [demandas, atividades] = await Promise.all([
      this.demandaRepositorio.buscarPorNome({ texto, usuarioId, limite }),
      this.atividadeRepositorio.buscarPorNome({ texto, usuarioId, limite }),
    ]);
    const referencias = combinarSugestoesDeReferencia(
      demandas.map((demanda): MensagemDiretaReferenciaResumoDto => ({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: demanda.id, nome: demanda.nome, situacao: demanda.status, demandaNome: null })),
      atividades.map((atividade): MensagemDiretaReferenciaResumoDto => ({ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: atividade.id, nome: atividade.nome, situacao: atividade.status, demandaNome: atividade.nomeDemanda })),
    );
    return { sucesso: true, dados: { referencias }, mensagem: 'Referências listadas com sucesso' };
  }

  /**
   * O cartão de uma referência **para quem está olhando**, que pode não ser quem escreveu: a mesma regra de acesso do envio. Sem acesso (ou inexistente)
   * devolve `acessivel: false` e nenhum dado, para o cartão aparecer bloqueado sem vazar o título.
   */
  async recuperarReferencia(dto: MensagemDiretaReferenciaRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaReferenciaRecuperadaDto>> {
    const resolvida = await this.resolverReferencia({ tipo: dto.tipo, id: dto.id }, usuarioAtivo);
    const dados: MensagemDiretaReferenciaRecuperadaDto = resolvida
      ? { tipo: dto.tipo, id: dto.id, acessivel: true, ...resolvida }
      : { tipo: dto.tipo, id: dto.id, acessivel: false, nome: null, situacao: null, projetoId: null, demandaId: null, demandaNome: null };
    return { sucesso: true, dados, mensagem: 'Referência recuperada com sucesso' };
  }

  async buscar(dto: MensagemDiretaBuscarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaBuscadoDto>> {
    const periodo = lerPeriodoDaBusca(dto.inicio, dto.fim);
    const mensagens = await this.armazenamento.buscar({
      usuarioId: usuarioAtivo.sub,
      texto: dto.texto,
      inicio: periodo.inicio,
      fim: periodo.fim,
      somenteCodigo: dto.somenteCodigo,
    });
    return { sucesso: true, dados: { mensagens }, mensagem: 'Busca realizada com sucesso' };
  }

  // ---------------------------------------------------------------------------
  // Leitura e silêncio
  // ---------------------------------------------------------------------------

  async alterarLeitura(
    dto: MensagemDiretaLeituraAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<MensagemDiretaLeituraAlteradaDto>> {
    await this.validarOutraPessoa(dto.usuarioId, usuarioAtivo);
    const conversaId = montarConversaDiretaId(usuarioAtivo.sub, dto.usuarioId);
    const marcador = await this.leituraRepositorio.alterarLeitura({
      conversaId,
      usuarioId: usuarioAtivo.sub,
      outroUsuarioId: dto.usuarioId,
      lidaAteDate: limitarLeituraAoAgora(dto.lidaAteDate, new Date()),
    });
    const lidaAteDate = marcador.lidaAteDate as Date;
    await this.eventosService.publicarParaUsuarios({
      usuarioIds: [usuarioAtivo.sub, dto.usuarioId],
      evento: { tipo: 'LEITURA', conversaId, usuarioId: usuarioAtivo.sub, lidaAteDate },
    });
    return {
      sucesso: true,
      dados: { conversaId, lidaAteDate },
      mensagem: 'Leitura registrada com sucesso',
    };
  }

  /**
   * O "digitando…": só repassa o aviso ao stream da outra pessoa (nunca a quem digita) e não grava nada. Falhar em publicar é ignorado pelo
   * publicador: o aviso vale poucos segundos e o próximo toque de tecla manda outro.
   */
  async avisarDigitacao(dto: MensagemDiretaDigitacaoAvisarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
    await this.validarOutraPessoa(dto.usuarioId, usuarioAtivo);
    await this.eventosService.publicarParaUsuarios({
      usuarioIds: [dto.usuarioId],
      evento: { tipo: 'DIGITANDO', conversaId: montarConversaDiretaId(usuarioAtivo.sub, dto.usuarioId), usuarioId: usuarioAtivo.sub },
    });
    return { sucesso: true, dados: null, mensagem: 'Aviso enviado' };
  }

  async alterarSilencio(
    dto: MensagemDiretaSilencioAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<MensagemDiretaSilencioAlteradoDto>> {
    await this.validarOutraPessoa(dto.usuarioId, usuarioAtivo);
    const conversaId = montarConversaDiretaId(usuarioAtivo.sub, dto.usuarioId);
    const marcador = await this.leituraRepositorio.alterarSilencio({
      conversaId,
      usuarioId: usuarioAtivo.sub,
      outroUsuarioId: dto.usuarioId,
      silenciada: dto.silenciada,
    });
    return {
      sucesso: true,
      dados: { conversaId, silenciada: marcador.silenciada },
      mensagem: marcador.silenciada ? 'Conversa silenciada' : 'Conversa reativada',
    };
  }

  // ---------------------------------------------------------------------------
  // Preferências
  // ---------------------------------------------------------------------------

  async recuperarPreferencia(usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaPreferenciaRecuperadaDto>> {
    const gravada = await this.preferenciaRepositorio.recuperar({ usuarioId: usuarioAtivo.sub });
    return {
      sucesso: true,
      dados: gravada ?? { ...PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA },
      mensagem: 'Preferências recuperadas com sucesso',
    };
  }

  async alterarPreferencia(
    dto: MensagemDiretaPreferenciaAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<MensagemDiretaPreferenciaAlteradaDto>> {
    const silenciadoAteDate = dto.silenciadoAteDate ? new Date(dto.silenciadoAteDate) : null;
    if (silenciadoAteDate && Number.isNaN(silenciadoAteDate.getTime())) throw new BusinessException('Data do silêncio inválida');

    const gravada = await this.preferenciaRepositorio.alterar({
      usuarioId: usuarioAtivo.sub,
      avisosAtivos: dto.avisosAtivos,
      avisoDesktopAtivo: dto.avisoDesktopAtivo,
      somAtivo: dto.somAtivo,
      silenciadoAteDate,
      atalhoGlobal: dto.atalhoGlobal,
    });
    return { sucesso: true, dados: gravada, mensagem: 'Preferências alteradas com sucesso' };
  }

  // ---------------------------------------------------------------------------
  // Validações
  // ---------------------------------------------------------------------------

  /** A outra pessoa da conversa é diferente de quem age e existe, **mesmo excluída**: o histórico continua dos dois e a lista a mostra como "Usuário removido". */
  private async validarOutraPessoa(outroUsuarioId: number, usuarioAtivo: JwtPayload): Promise<void> {
    if (outroUsuarioId === usuarioAtivo.sub) throw new BusinessException('A conversa precisa ser com outra pessoa');
    if (!(await this.usuarioRepositorio.validarExistenciaIncluindoExcluido({ id: outroUsuarioId }))) throw new ResourceNotFoundException('Usuário');
  }

  /** Para enviar o destinatário precisa, além disso, existir sem exclusão e estar **ativo**. */
  /**
   * A citação da resposta (task 220): autor e trecho saem da mensagem original, lida **nesta conversa**; o cliente só diz qual é. A mensagem do sistema
   * (aviso da supervisão, por exemplo) não é respondida.
   */
  private async montarCitacao(respondeAMensagemId: string | undefined, conversaId: string): Promise<CitacaoMensagemDto | null> {
    if (!respondeAMensagemId) return null;
    const original = await this.armazenamento.recuperarMensagem({ conversaId, mensagemId: respondeAMensagemId });
    if (!original || original.autor !== AutorMensagemDiretaEnum.USUARIO || original.autorUsuarioId === null) {
      throw new BusinessException('A mensagem respondida não existe nesta conversa');
    }
    return { mensagemId: original.mensagemId, autorUsuarioId: original.autorUsuarioId, trecho: trechoDaMensagemDireta(original.texto) };
  }

  private async validarDestinatarioAtivo(destinatarioId: number, usuarioAtivo: JwtPayload): Promise<void> {
    if (destinatarioId === usuarioAtivo.sub) throw new BusinessException('A conversa precisa ser com outra pessoa');
    const encontrado = await this.usuarioRepositorio.recuperar({ id: destinatarioId });
    if (!encontrado) throw new ResourceNotFoundException('Usuário');
    if (encontrado.status !== TipoUsuarioStatusEnum.ATIVO) throw new BusinessException('Não é possível enviar mensagem para um usuário inativo');
  }

  /**
   * A demanda ou a atividade existe e, para o desenvolvedor, é uma que ele mesmo vê (as mesmas regras de `DemandaService` e `AtividadeService`).
   * Gestor e administrador veem tudo. Devolve os dados do cartão, ou `null` quando não existe ou **quem pergunta** não tem acesso. Uma regra só, para o
   * envio (quem escreve) e o cartão (quem lê, que pode ser o destinatário sem acesso).
   */
  private async resolverReferencia(
    referencia: ReferenciaMensagemDto,
    usuarioAtivo: JwtPayload,
  ): Promise<ReferenciaResolvida | null> {
    const ehDesenvolvedor = usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR;
    if (referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA) {
      const demanda = await this.demandaRepositorio.recuperar({ id: referencia.id }, ehDesenvolvedor ? { usuarioId: usuarioAtivo.sub } : undefined);
      return demanda ? { nome: demanda.nome, situacao: demanda.status, projetoId: demanda.projetoId, demandaId: null, demandaNome: null } : null;
    }

    const atividade = await this.atividadeRepositorio.recuperar({ id: referencia.id });
    if (!atividade) return null;
    if (ehDesenvolvedor && !(await this.atividadeRepositorio.validarAcessoDemanda({ demandaId: atividade.demandaId, usuarioId: usuarioAtivo.sub }))) return null;
    return { nome: atividade.nome, situacao: atividade.status, projetoId: atividade.projetoId, demandaId: atividade.demandaId, demandaNome: atividade.nomeDemanda };
  }

  private async validarReferencia(referencia: ReferenciaMensagemDto, usuarioAtivo: JwtPayload): Promise<void> {
    if (await this.resolverReferencia(referencia, usuarioAtivo)) return;
    const rotulo = referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA ? 'A demanda' : 'A atividade';
    throw new BusinessException(`${rotulo} ${referencia.id} não existe ou você não tem acesso a ela`);
  }
}
