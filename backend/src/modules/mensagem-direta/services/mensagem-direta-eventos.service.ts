import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MensagemDiretaEventoDto, MensagemDiretaEventoPublicarDto, TipoUsuarioStatusEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { ConexaoDeEventosDiretos, ConexoesDeEventosDiretos } from '../domain/conexoes-de-eventos-diretos';
import { MensagemDoBarramento } from '../domain/mensagem-direta-barramento';
import { diferencaDePresenca, PresencaGlobal } from '../domain/presenca-global';
import { PUBLICADOR_DE_EVENTOS_DIRETOS, PublicadorDeEventosDiretos } from '../publicadores/publicador-de-eventos-diretos';

/** O batimento mantém o stream vivo atrás de proxy e mostra ao servidor quem sumiu; o proxy deve esperar mais que isto. */
export const INTERVALO_DO_BATIMENTO_EM_MILISSEGUNDOS = 25_000;
/** Três batimentos: uma instância que caiu e parou de publicar deixa de contar para a presença depois disto. */
export const VALIDADE_DA_PRESENCA_EM_MILISSEGUNDOS = 3 * INTERVALO_DO_BATIMENTO_EM_MILISSEGUNDOS;
export const INTERVALO_DA_EXPIRACAO_EM_MILISSEGUNDOS = 5_000;

/**
 * O tempo real do chat entre colaboradores (task 209) nesta instância da API: guarda os streams abertos, entrega a eles o que o barramento
 * traz e mantém a presença (quem está online em qualquer instância). Quem publica um evento (a `MensagemDiretaService`) não fala com o
 * stream: chama `publicarParaUsuarios`, e cada instância entrega a quem está conectado nela.
 */
@Injectable()
export class MensagemDiretaEventosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MensagemDiretaEventosService.name);
  private readonly instanciaId = randomUUID();
  private readonly conexoes = new ConexoesDeEventosDiretos();
  private readonly presenca = new PresencaGlobal(VALIDADE_DA_PRESENCA_EM_MILISSEGUNDOS);
  private ultimosOnline = new Set<number>();
  private cancelarAssinatura: (() => void) | null = null;
  private temporizadorDoBatimento: NodeJS.Timeout | null = null;
  private temporizadorDaExpiracao: NodeJS.Timeout | null = null;
  private encerrando = false;

  constructor(
    @Inject(PUBLICADOR_DE_EVENTOS_DIRETOS) private readonly publicador: PublicadorDeEventosDiretos,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {}

  onModuleInit(): void {
    this.cancelarAssinatura = this.publicador.assinar({
      aoReceber: (mensagem) => this.aoReceber(mensagem),
      aoReconectar: () => this.aoReconectar(),
    });
    this.temporizadorDoBatimento = setInterval(() => this.baterCoracao(), INTERVALO_DO_BATIMENTO_EM_MILISSEGUNDOS);
    this.temporizadorDoBatimento.unref();
    // A instância que some só deixa de contar quando a validade vence; verificar com mais frequência que o batimento limita o atraso a ~5 s.
    this.temporizadorDaExpiracao = setInterval(() => this.emitirMudancasDePresenca(), INTERVALO_DA_EXPIRACAO_EM_MILISSEGUNDOS);
    this.temporizadorDaExpiracao.unref();
  }

  /**
   * Parada ordenada: deixa de aceitar streams, avisa os clientes para reconectarem (em outra instância), fecha os streams (senão o servidor
   * esperaria por eles) e sai da presença. A saída da presença não é esperada: com o banco fora do ar ela demoraria e seguraria a parada.
   */
  onModuleDestroy(): void {
    this.encerrando = true;
    if (this.temporizadorDoBatimento) clearInterval(this.temporizadorDoBatimento);
    if (this.temporizadorDaExpiracao) clearInterval(this.temporizadorDaExpiracao);
    this.temporizadorDoBatimento = null;
    this.temporizadorDaExpiracao = null;
    this.conexoes.entregarATodos({ tipo: 'ENCERRANDO' });
    this.conexoes.encerrarTodas();
    this.cancelarAssinatura?.();
    this.cancelarAssinatura = null;
    void this.publicarSemFalhar({ tipo: 'PRESENCA', instanciaId: this.instanciaId, usuarioIds: [] });
  }

  /**
   * Abre o stream de um usuário: registra a conexão, anuncia que ele está online e manda a `ABERTURA` com quem já está.
   * Devolve a função que fecha (chamada quando o cliente desconecta).
   */
  abrir(usuarioAtivo: JwtPayload, conexao: ConexaoDeEventosDiretos): () => void {
    const usuarioId = usuarioAtivo.sub;
    // Durante a parada não se aceita stream novo: o cliente que acabou de receber ENCERRANDO reconecta, e aqui ele só acharia a porta fechando.
    if (this.encerrando) {
      conexao.enviar({ tipo: 'ENCERRANDO' });
      conexao.encerrar();
      return () => undefined;
    }
    // A abertura é sempre o primeiro evento do stream; quem abre já conta como online nela.
    const onlineUsuarioIds = [...new Set([...this.presenca.online(), usuarioId])].sort((a, b) => a - b);
    conexao.enviar({ tipo: 'ABERTURA', onlineUsuarioIds });
    const remover = this.conexoes.adicionar(usuarioId, conexao);
    this.atualizarPresencaLocal();
    return () => {
      remover();
      this.atualizarPresencaLocal();
    };
  }

  /** Quem está online em qualquer instância (para a lista de conversas). */
  listarUsuariosOnline(): Set<number> {
    return this.presenca.online();
  }

  /** Publica um evento para os streams dos usuários. Falhar aqui não falha a operação que o gerou: a mensagem já está gravada e o cliente a recupera ao reconectar. */
  async publicarParaUsuarios(dto: MensagemDiretaEventoPublicarDto): Promise<void> {
    await this.publicarSemFalhar({ tipo: 'ENTREGA', usuarioIds: dto.usuarioIds, evento: dto.evento });
  }

  // ---------------------------------------------------------------------------

  private aoReceber(mensagem: MensagemDoBarramento): void {
    if (mensagem.tipo === 'ENTREGA') {
      this.conexoes.entregar(mensagem.usuarioIds, mensagem.evento);
      return;
    }
    // O conjunto desta instância já foi aplicado na hora; o eco do barramento não o altera.
    if (mensagem.instanciaId === this.instanciaId) return;
    this.presenca.atualizarInstancia(mensagem.instanciaId, mensagem.usuarioIds);
    this.emitirMudancasDePresenca();
  }

  private aoReconectar(): void {
    this.conexoes.entregarATodos({ tipo: 'SINCRONIZAR', conversaId: null });
    void this.publicarSemFalhar({ tipo: 'PRESENCA', instanciaId: this.instanciaId, usuarioIds: this.conexoes.usuariosConectados() });
  }

  private baterCoracao(): void {
    this.conexoes.entregarATodos({ tipo: 'BATIMENTO' });
    this.atualizarPresencaLocal();
    void this.fecharStreamsDeUsuariosInativos();
  }

  /**
   * A autenticação confere o usuário só quando a requisição abre (P-031), e o stream fica aberto sem prazo: a cada batimento, confere os
   * usuários conectados nesta instância e fecha o stream de quem foi desativado ou excluído (P-061). Cada instância confere os seus, então
   * não precisa avisar as outras. Se a consulta falha, o stream segue aberto até o próximo batimento (não derruba ninguém por um erro do banco).
   */
  async fecharStreamsDeUsuariosInativos(): Promise<void> {
    let fechou = false;
    for (const usuarioId of this.conexoes.usuariosConectados()) {
      try {
        const usuarioEncontrado = await this.usuarioRepositorio.recuperar({ id: usuarioId });
        if (usuarioEncontrado && usuarioEncontrado.status !== TipoUsuarioStatusEnum.INATIVO) continue;
        this.conexoes.encerrarUsuario(usuarioId);
        fechou = true;
      } catch (erro) {
        this.logger.warn(`Usuário ${usuarioId} não conferido: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
    }
    if (fechou) this.atualizarPresencaLocal();
  }

  /** O conjunto desta instância muda na hora para quem está aqui e vai para as outras instâncias; também expira as que sumiram. */
  private atualizarPresencaLocal(): void {
    const usuarioIds = this.conexoes.usuariosConectados();
    this.presenca.atualizarInstancia(this.instanciaId, usuarioIds);
    this.emitirMudancasDePresenca();
    void this.publicarSemFalhar({ tipo: 'PRESENCA', instanciaId: this.instanciaId, usuarioIds });
  }

  private emitirMudancasDePresenca(): void {
    const atuais = this.presenca.online();
    for (const mudanca of diferencaDePresenca(this.ultimosOnline, atuais)) {
      this.conexoes.entregarATodos({ tipo: 'PRESENCA', usuarioId: mudanca.usuarioId, online: mudanca.online });
    }
    this.ultimosOnline = atuais;
  }

  private async publicarSemFalhar(mensagem: MensagemDoBarramento): Promise<void> {
    try {
      await this.publicador.publicar(mensagem);
    } catch (erro) {
      this.logger.warn(`Evento do chat não publicado: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
}
