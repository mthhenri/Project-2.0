import { randomUUID } from 'node:crypto';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Knex } from 'knex';
import { Client } from 'pg';
import { ConfiguracaoBancoDados } from '../../../config/config.interface';
import { decodificarMensagemDoBarramento, MensagemDoBarramento, prepararParaNotify } from '../domain/mensagem-direta-barramento';
import { OuvinteDoBarramento, PublicadorDeEventosDiretos } from './publicador-de-eventos-diretos';

export const CANAL_DE_EVENTOS_DIRETOS = 'mensagem_direta_eventos';

const ESPERA_INICIAL_EM_MILISSEGUNDOS = 1_000;
const ESPERA_MAXIMA_EM_MILISSEGUNDOS = 30_000;

/**
 * Uma conexão de escuta só recebe dados: se a rede some sem RST (NAT que esquece a conexão, host do banco que cai), nenhum erro chega e a instância
 * ficaria surda sem saber. Por isso cada instância envia a si mesma um PING e recicla a escuta se o eco não voltar dentro da tolerância.
 */
export interface OpcoesDoVigiaDaEscuta {
  intervaloDoPingEmMilissegundos: number;
  toleranciaSemEcoEmMilissegundos: number;
}
const OPCOES_PADRAO_DO_VIGIA: OpcoesDoVigiaDaEscuta = { intervaloDoPingEmMilissegundos: 20_000, toleranciaSemEcoEmMilissegundos: 60_000 };

/**
 * O barramento de produção: `LISTEN`/`NOTIFY` do PostgreSQL (task 209), sem broker novo. Publicar é um `pg_notify` por uma conexão do pool;
 * escutar usa UMA conexão dedicada, que reconecta sozinha com espera crescente. Toda instância (inclusive a que publicou) recebe a notificação
 * pela escuta, então há um caminho só. Se a escuta cai e volta, os ouvintes são avisados (`aoReconectar`) para os clientes relerem o que perderam.
 * O banco fora do ar na subida não derruba a API: a escuta insiste em segundo plano.
 */
export class PublicadorPostgres implements PublicadorDeEventosDiretos, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicadorPostgres.name);
  private readonly ouvintes = new Set<OuvinteDoBarramento>();
  private cliente: Client | null = null;
  private temporizadorDeReconexao: NodeJS.Timeout | null = null;
  private espera = ESPERA_INICIAL_EM_MILISSEGUNDOS;
  private jaEscutou = false;
  private escutando = false;
  private parado = false;
  private readonly instanciaId = randomUUID();
  private ultimoEcoEm = Date.now();
  private temporizadorDoVigia: NodeJS.Timeout | null = null;

  constructor(
    private readonly conexaoBancoDados: Knex,
    private readonly configuracaoBanco: ConfiguracaoBancoDados,
    private readonly vigia: OpcoesDoVigiaDaEscuta = OPCOES_PADRAO_DO_VIGIA,
  ) {}

  /** A escuta está ativa (o `LISTEN` foi aceito). Antes disso um `NOTIFY` não chega a esta instância. */
  estaEscutando(): boolean {
    return this.escutando;
  }

  onModuleInit(): void {
    void this.escutar();
    this.temporizadorDoVigia = setInterval(() => this.vigiar(), this.vigia.intervaloDoPingEmMilissegundos);
    this.temporizadorDoVigia.unref();
  }

  async onModuleDestroy(): Promise<void> {
    this.parado = true;
    this.escutando = false;
    if (this.temporizadorDoVigia) clearInterval(this.temporizadorDoVigia);
    this.temporizadorDoVigia = null;
    if (this.temporizadorDeReconexao) clearTimeout(this.temporizadorDeReconexao);
    this.temporizadorDeReconexao = null;
    const cliente = this.cliente;
    this.cliente = null;
    await cliente?.end().catch(() => undefined);
  }

  async publicar(mensagem: MensagemDoBarramento): Promise<void> {
    await this.conexaoBancoDados.raw('SELECT pg_notify(:canal, :carga)', { canal: CANAL_DE_EVENTOS_DIRETOS, carga: prepararParaNotify(mensagem) });
  }

  assinar(ouvinte: OuvinteDoBarramento): () => void {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }

  private async escutar(): Promise<void> {
    if (this.parado) return;
    const { host, porta, nome, usuario, senha, ssl } = this.configuracaoBanco;
    const cliente = new Client({ host, port: porta, database: nome, user: usuario, password: senha, ssl: ssl ? { rejectUnauthorized: false } : false,
      keepAlive: true, connectionTimeoutMillis: 10_000 });
    // Um erro de rede sem ouvinte derrubaria o processo.
    cliente.on('error', (erro) => this.aoCair(cliente, erro));
    cliente.on('end', () => this.aoCair(cliente, new Error('conexão encerrada')));
    cliente.on('notification', (notificacao) => {
      if (notificacao.channel !== CANAL_DE_EVENTOS_DIRETOS || !notificacao.payload) return;
      if (notificacao.payload === this.cargaDoPing()) {
        this.ultimoEcoEm = Date.now();
        return;
      }
      const mensagem = decodificarMensagemDoBarramento(notificacao.payload);
      if (!mensagem) {
        this.logger.warn('Notificação do chat ignorada: carga inválida');
        return;
      }
      for (const ouvinte of [...this.ouvintes]) ouvinte.aoReceber(mensagem);
    });

    try {
      await cliente.connect();
      await cliente.query(`LISTEN ${CANAL_DE_EVENTOS_DIRETOS}`);
    } catch (erro) {
      cliente.removeAllListeners();
      cliente.on('error', () => undefined);
      await cliente.end().catch(() => undefined);
      this.agendarReconexao(erro);
      return;
    }

    if (this.parado) {
      await cliente.end().catch(() => undefined);
      return;
    }
    this.cliente = cliente;
    this.escutando = true;
    this.ultimoEcoEm = Date.now();
    this.espera = ESPERA_INICIAL_EM_MILISSEGUNDOS;
    if (this.jaEscutou) {
      this.logger.log('Escuta do chat restabelecida');
      for (const ouvinte of [...this.ouvintes]) ouvinte.aoReconectar();
    }
    this.jaEscutou = true;
  }

  private cargaDoPing(): string {
    return JSON.stringify({ tipo: 'PING', instanciaId: this.instanciaId });
  }

  /** Envia o PING e, se a escuta está ativa mas o eco do anterior não voltou na tolerância, derruba a conexão para a reconexão normal assumir. */
  private vigiar(): void {
    const cliente = this.cliente;
    if (this.parado || !cliente || !this.escutando) return;
    if (Date.now() - this.ultimoEcoEm > this.vigia.toleranciaSemEcoEmMilissegundos) {
      this.logger.warn('Escuta do chat sem eco do PING; reciclando a conexão');
      this.aoCair(cliente, new Error('sem eco do PING'));
      return;
    }
    this.conexaoBancoDados.raw('SELECT pg_notify(:canal, :carga)', { canal: CANAL_DE_EVENTOS_DIRETOS, carga: this.cargaDoPing() }).catch(() => undefined);
  }

  private aoCair(cliente: Client, erro: unknown): void {
    if (this.cliente !== cliente) return;
    this.cliente = null;
    this.escutando = false;
    cliente.removeAllListeners();
    cliente.on('error', () => undefined);
    void cliente.end().catch(() => undefined);
    this.agendarReconexao(erro);
  }

  private agendarReconexao(erro: unknown): void {
    if (this.parado || this.temporizadorDeReconexao) return;
    const motivo = erro instanceof Error ? erro.message : String(erro);
    this.logger.warn(`Escuta do chat indisponível (${motivo}); nova tentativa em ${Math.round(this.espera / 1000)}s`);
    this.temporizadorDeReconexao = setTimeout(() => {
      this.temporizadorDeReconexao = null;
      void this.escutar();
    }, this.espera);
    this.temporizadorDeReconexao.unref();
    this.espera = Math.min(this.espera * 2, ESPERA_MAXIMA_EM_MILISSEGUNDOS);
  }
}
