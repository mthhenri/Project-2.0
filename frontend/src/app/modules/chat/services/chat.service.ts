import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChatBuscadoDto,
  ChatConversasListadasDto,
  ChatConversaTituloAlteradoDto,
  ChatEventoDto,
  ChatHojeRecuperadoDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';
import { extrairEventos } from '../utils/chat.util';

/** A resposta de erro do envio (HTTP) ou da conexão: a tela mostra `mensagem` e decide o que fazer pelo `status`. */
export class ErroDoChat extends Error {
  constructor(
    readonly mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

/** Chat com a IA: leituras pelo `HttpClient` e o envio por `fetch`, porque a resposta é um fluxo (`text/event-stream`) sobre `POST`. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/chat`;

  recuperarHoje(): Observable<StandardResponse<ChatHojeRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<ChatHojeRecuperadoDto>>(`${this.urlBase}/hoje`, comFeedbackProprio());
  }

  listarConversas(): Observable<StandardResponse<ChatConversasListadasDto>> {
    return this.httpClient.get<StandardResponse<ChatConversasListadasDto>>(`${this.urlBase}/conversas`, comFeedbackProprio());
  }

  /** A conversa de um dia (`yyyy-mm-dd`) do próprio usuário, no mesmo formato de `recuperarHoje`. */
  recuperarConversa(data: string): Observable<StandardResponse<ChatHojeRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<ChatHojeRecuperadoDto>>(`${this.urlBase}/conversa/${data}`, comFeedbackProprio());
  }

  /** Renomeia a conversa de um dia (`yyyy-mm-dd`); em branco volta ao nome padrão. Quem chama dá o aviso de erro (sem overlay global). */
  alterarTituloConversa(data: string, titulo: string): Observable<StandardResponse<ChatConversaTituloAlteradoDto>> {
    return this.httpClient.put<StandardResponse<ChatConversaTituloAlteradoDto>>(`${this.urlBase}/conversa/${data}/titulo`, { titulo }, comFeedbackProprio());
  }

  buscar(texto: string): Observable<StandardResponse<ChatBuscadoDto>> {
    const params = new HttpParams().set('texto', texto);
    return this.httpClient.get<StandardResponse<ChatBuscadoDto>>(`${this.urlBase}/busca`, { params, ...comFeedbackProprio() });
  }

  /**
   * Envia a mensagem e entrega os eventos conforme chegam. Termina em `fim` ou `erro` (evento) ou lança `ErroDoChat` quando o servidor
   * recusa antes de começar o fluxo (IA desligada, mensagem em andamento, sessão expirada). `sinal` interrompe a leitura (não a geração).
   * `caminho` troca a rota (a conversa do check-in usa `/checkin/mensagem`, no mesmo formato).
   */
  async enviarMensagem(texto: string, aoEvento: (evento: ChatEventoDto) => void, sinal?: AbortSignal, caminho = '/chat/mensagem'): Promise<void> {
    const token = localStorage.getItem('access_token');
    let resposta: Response;
    try {
      resposta = await fetch(`${ambiente.apiUrl}${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ texto }),
        signal: sinal,
      });
    } catch {
      throw new ErroDoChat('Sem conexão com o servidor. Tente de novo.', 0);
    }

    await this.lerFluxo(resposta, aoEvento);
  }

  /**
   * O "bom dia" proativo: abre o fluxo de eventos da saudação do dia (só vale se a conversa de hoje ainda não tem resposta da IA).
   * Termina como `enviarMensagem`; lança `ErroDoChat` com 409 quando o bom dia de hoje já foi dado ou a IA está desligada.
   */
  async iniciarBomDia(aoEvento: (evento: ChatEventoDto) => void): Promise<void> {
    await this.iniciarFluxoDoServidor('/bom-dia', aoEvento);
  }

  /**
   * A retomada depois de uma queda da IA (task 158): a IA lê o que mudou à mão e continua a conversa do dia. Termina como
   * `enviarMensagem`; 409 quando não há conversa hoje para retomar, a IA está desligada ou ainda está respondendo.
   */
  async iniciarRetomada(aoEvento: (evento: ChatEventoDto) => void): Promise<void> {
    await this.iniciarFluxoDoServidor('/retomada', aoEvento);
  }

  /** Um fluxo que o próprio servidor começa (sem mensagem do usuário): o bom dia e a retomada. */
  private async iniciarFluxoDoServidor(caminho: string, aoEvento: (evento: ChatEventoDto) => void): Promise<void> {
    const token = localStorage.getItem('access_token');
    let resposta: Response;
    try {
      resposta = await fetch(`${this.urlBase}${caminho}`, {
        method: 'POST',
        headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch {
      throw new ErroDoChat('Sem conexão com o servidor. Tente de novo.', 0);
    }
    await this.lerFluxo(resposta, aoEvento);
  }

  private async lerFluxo(resposta: Response, aoEvento: (evento: ChatEventoDto) => void): Promise<void> {
    if (!resposta.ok || !resposta.body) {
      const corpo = await resposta.json().catch(() => null);
      throw new ErroDoChat(corpo?.mensagem ?? 'Não foi possível enviar a mensagem.', resposta.status);
    }

    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    let acumulado = '';
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      acumulado += decodificador.decode(value, { stream: true });
      const { eventos, resto } = extrairEventos(acumulado);
      acumulado = resto;
      eventos.forEach(aoEvento);
    }
  }
}
