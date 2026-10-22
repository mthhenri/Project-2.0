import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MensagemDiretaEventoDto } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { parametrosRetorno } from '../../../core/interceptors/error-handler.interceptor';
import { extrairEventos } from '../../chat/utils/chat.util';
import { esperaDaReconexao, semSinalHaMuito } from '../utils/mensagem-direta.util';

export interface OuvintesDoStream {
  aoEvento(evento: MensagemDiretaEventoDto): void;
  /**
   * O stream voltou depois de uma queda: o que aconteceu nesse intervalo não chegou, então quem escuta relê o que mostra (lista e conversa
   * aberta). Só é chamado depois da `ABERTURA` da nova conexão (nunca na primeira) e nunca numa conexão que o servidor já está encerrando.
   */
  aoReconectar(): void;
}

const INTERVALO_DO_VIGIA_MS = 10_000;

/**
 * O stream de eventos do chat entre colaboradores (`GET /mensagem-direta/eventos`, task 210). Usa `fetch` com o cabeçalho de autorização
 * (`EventSource` não envia `Authorization`). Reconecta sozinho com espera crescente; uma conexão sem nenhum dado por mais de 70 s (o servidor bate
 * a cada 25 s) é reiniciada. Sessão expirada (401) encerra de vez: quem recebe a mensagem é o login, não este serviço.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaEventosService {
  private readonly roteador = inject(Router);
  private readonly _conectado = signal(false);
  /** O stream está aberto agora (a `ABERTURA` chegou). Falso antes da primeira conexão, durante as quedas e quando o servidor encerra. */
  readonly conectado = this._conectado.asReadonly();

  private ouvintes: OuvintesDoStream | null = null;
  private controlador: AbortController | null = null;
  private ativo = false;
  private jaConectouUmaVez = false;
  private temporizadorDaEspera: ReturnType<typeof setTimeout> | null = null;

  iniciar(ouvintes: OuvintesDoStream): void {
    if (this.ativo) return;
    this.ativo = true;
    this.ouvintes = ouvintes;
    this.jaConectouUmaVez = false;
    void this.manter();
  }

  parar(): void {
    this.ativo = false;
    this.ouvintes = null;
    this.controlador?.abort();
    this.controlador = null;
    if (this.temporizadorDaEspera) clearTimeout(this.temporizadorDaEspera);
    this.temporizadorDaEspera = null;
    this._conectado.set(false);
  }

  private async manter(): Promise<void> {
    let falhasSeguidas = 0;
    while (this.ativo) {
      const resultado = await this.conectarEUvir();
      this._conectado.set(false);
      if (!this.ativo || resultado === 'SESSAO_EXPIRADA') break;
      falhasSeguidas = resultado === 'LEU' ? 0 : falhasSeguidas + 1;
      await this.esperar(esperaDaReconexao(falhasSeguidas === 0 ? 0 : falhasSeguidas - 1));
    }
  }

  /**
   * O token expirou: o mesmo tratamento do interceptor de erros (que as chamadas do popup, por mostrarem os próprios erros, não acionam) — limpa a
   * sessão e leva ao login, voltando depois à tela em que o usuário estava.
   */
  private encerrarPorSessaoExpirada(): void {
    this.parar();
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario_sessao');
    void this.roteador.navigate(['/autenticacao'], { queryParams: parametrosRetorno(this.roteador.url) });
  }

  private esperar(milissegundos: number): Promise<void> {
    return new Promise((resolver) => {
      this.temporizadorDaEspera = setTimeout(() => {
        this.temporizadorDaEspera = null;
        resolver();
      }, milissegundos);
    });
  }

  /**
   * Abre o stream e entrega os eventos até ele acabar. `LEU` = a conexão se firmou (chegou a `ABERTURA`) e não foi o servidor que a encerrou:
   * a próxima espera recomeça pequena. Conexão que o servidor encerra logo (deploy em andamento: `ENCERRANDO`) ou que nem chega à `ABERTURA`
   * conta como falha, para a espera crescer em vez de todos os clientes baterem na instância a cada segundo.
   */
  private async conectarEUvir(): Promise<'LEU' | 'FALHOU' | 'SESSAO_EXPIRADA'> {
    const controlador = new AbortController();
    this.controlador = controlador;
    const token = localStorage.getItem('access_token');
    let ultimoDadoEm = Date.now();
    const vigia = setInterval(() => {
      if (semSinalHaMuito(ultimoDadoEm, Date.now())) controlador.abort();
    }, INTERVALO_DO_VIGIA_MS);

    try {
      const resposta = await fetch(`${ambiente.apiUrl}/mensagem-direta/eventos`, {
        headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: controlador.signal,
      });
      if (resposta.status === 401) {
        this.encerrarPorSessaoExpirada();
        return 'SESSAO_EXPIRADA';
      }
      if (!resposta.ok || !resposta.body) return 'FALHOU';

      let abriu = false;
      let encerradoPeloServidor = false;

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = '';
      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        ultimoDadoEm = Date.now();
        acumulado += decodificador.decode(value, { stream: true });
        const { eventos, resto } = extrairEventos<MensagemDiretaEventoDto>(acumulado);
        acumulado = resto;
        for (const evento of eventos) {
          if (evento.tipo === 'ENCERRANDO') encerradoPeloServidor = true;
          if (evento.tipo === 'ABERTURA' && !abriu && !encerradoPeloServidor) {
            abriu = true;
            this._conectado.set(true);
            // A recuperação vem DEPOIS da abertura: só então a conexão é de fato nova e útil.
            if (this.jaConectouUmaVez) this.ouvintes?.aoReconectar();
            this.jaConectouUmaVez = true;
          }
          this.ouvintes?.aoEvento(evento);
        }
      }
      return abriu && !encerradoPeloServidor ? 'LEU' : 'FALHOU';
    } catch {
      // Rede caiu, conexão reiniciada pelo vigia ou `parar()`: quem chamou decide se tenta de novo.
      return this._conectado() ? 'LEU' : 'FALHOU';
    } finally {
      clearInterval(vigia);
    }
  }
}
