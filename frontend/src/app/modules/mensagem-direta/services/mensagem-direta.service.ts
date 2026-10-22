import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ConversaDiretaListadasDto,
  MensagemDiretaBuscadoDto,
  MensagemDiretaEnviadaDto,
  MensagemDiretaEnviarDto,
  MensagemDiretaLeituraAlteradaDto,
  MensagemDiretaListadasDto,
  MensagemDiretaPessoasListadasDto,
  MensagemDiretaPreferenciaAlterarDto,
  MensagemDiretaPreferenciaAlteradaDto,
  MensagemDiretaPreferenciaRecuperadaDto,
  MensagemDiretaSilencioAlteradoDto,
  MensagemDiretaReferenciaRecuperadaDto,
  MensagemDiretaReferenciasBuscadasDto,
  ReferenciaMensagemDiretaEnum,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/**
 * Chat entre colaboradores (task 210), a parte HTTP. O popup mostra os próprios erros e estados de carga, por isso as chamadas não acionam o
 * overlay global nem o aviso global de erro. O stream de eventos é do `MensagemDiretaEventosService`.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/mensagem-direta`;

  listarConversas(): Observable<StandardResponse<ConversaDiretaListadasDto>> {
    return this.httpClient.get<StandardResponse<ConversaDiretaListadasDto>>(`${this.urlBase}/conversas`, comFeedbackProprioEErroTratado());
  }

  /** Uma página da conversa com uma pessoa, da mais nova para a mais antiga; `cursor` é o `proximoCursor` da página anterior. */
  listarConversa(usuarioId: number, cursor?: string | null): Observable<StandardResponse<MensagemDiretaListadasDto>> {
    let params = new HttpParams();
    if (cursor) params = params.set('cursor', cursor);
    return this.httpClient.get<StandardResponse<MensagemDiretaListadasDto>>(`${this.urlBase}/conversa/${usuarioId}`, { params, ...comFeedbackProprioEErroTratado() });
  }

  enviarMensagem(dto: MensagemDiretaEnviarDto): Observable<StandardResponse<MensagemDiretaEnviadaDto>> {
    return this.httpClient.post<StandardResponse<MensagemDiretaEnviadaDto>>(`${this.urlBase}/mensagem`, dto, comFeedbackProprioEErroTratado());
  }

  /** Marca a conversa como lida até a data da última mensagem que a pessoa viu. */
  alterarLeitura(usuarioId: number, lidaAteDate: Date): Observable<StandardResponse<MensagemDiretaLeituraAlteradaDto>> {
    return this.httpClient.put<StandardResponse<MensagemDiretaLeituraAlteradaDto>>(
      `${this.urlBase}/conversa/${usuarioId}/leitura`,
      { lidaAteDate: lidaAteDate.toISOString() },
      comFeedbackProprioEErroTratado(),
    );
  }

  buscar(texto: string): Observable<StandardResponse<MensagemDiretaBuscadoDto>> {
    const params = new HttpParams().set('texto', texto);
    return this.httpClient.get<StandardResponse<MensagemDiretaBuscadoDto>>(`${this.urlBase}/busca`, { params, ...comFeedbackProprioEErroTratado() });
  }

  /** As sugestões do `#`: demandas e atividades que o usuário pode referenciar, pelo nome (pelo menos duas letras). */
  buscarReferencias(texto: string): Observable<StandardResponse<MensagemDiretaReferenciasBuscadasDto>> {
    const params = new HttpParams().set('texto', texto);
    return this.httpClient.get<StandardResponse<MensagemDiretaReferenciasBuscadasDto>>(`${this.urlBase}/referencias`, { params, ...comFeedbackProprioEErroTratado() });
  }

  /** O cartão de uma referência para quem está olhando: sem acesso, `acessivel: false` e nenhum dado. */
  recuperarReferencia(tipo: ReferenciaMensagemDiretaEnum, id: number): Observable<StandardResponse<MensagemDiretaReferenciaRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<MensagemDiretaReferenciaRecuperadaDto>>(`${this.urlBase}/referencia/${tipo}/${id}`, comFeedbackProprioEErroTratado());
  }

  /** As preferências de aviso do usuário; sem linha gravada o servidor devolve o padrão. */
  recuperarPreferencia(): Observable<StandardResponse<MensagemDiretaPreferenciaRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<MensagemDiretaPreferenciaRecuperadaDto>>(`${this.urlBase}/preferencia`, comFeedbackProprioEErroTratado());
  }

  /** Troca o conjunto inteiro de preferências (a rota não aceita parcial). */
  alterarPreferencia(dto: MensagemDiretaPreferenciaAlterarDto): Observable<StandardResponse<MensagemDiretaPreferenciaAlteradaDto>> {
    return this.httpClient.put<StandardResponse<MensagemDiretaPreferenciaAlteradaDto>>(`${this.urlBase}/preferencia`, dto, comFeedbackProprioEErroTratado());
  }

  /** Silencia (ou reativa) os avisos da conversa com uma pessoa. */
  alterarSilencio(usuarioId: number, silenciada: boolean): Observable<StandardResponse<MensagemDiretaSilencioAlteradoDto>> {
    return this.httpClient.put<StandardResponse<MensagemDiretaSilencioAlteradoDto>>(`${this.urlBase}/conversa/${usuarioId}/silencio`, { silenciada }, comFeedbackProprioEErroTratado());
  }

  listarPessoas(): Observable<StandardResponse<MensagemDiretaPessoasListadasDto>> {
    return this.httpClient.get<StandardResponse<MensagemDiretaPessoasListadasDto>>(`${this.urlBase}/pessoas`, comFeedbackProprioEErroTratado());
  }
}
