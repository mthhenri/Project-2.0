import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PropostaIaAjustadaDto,
  PropostaIaAjustarDto,
  PropostaIaConfirmadaDto,
  PropostaIaDesfeitaDto,
  PropostaIaRecuperadaDto,
  PropostaIaRecusadaDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/**
 * Resolução das propostas da IA (só as do próprio usuário). O cartão trata os erros (409 "já resolvida" recarrega o cartão), então
 * as chamadas não acionam o toast genérico do interceptor. O cartão também dá o próprio feedback (esmaece ao operar), então nenhuma
 * delas aciona o overlay global que trava a tela.
 */
@Injectable({ providedIn: 'root' })
export class PropostaIaService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/proposta-ia`;

  recuperarPorId(id: number): Observable<StandardResponse<PropostaIaRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<PropostaIaRecuperadaDto>>(`${this.urlBase}/${id}`, comFeedbackProprioEErroTratado());
  }

  confirmar(id: number): Observable<StandardResponse<PropostaIaConfirmadaDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaConfirmadaDto>>(`${this.urlBase}/${id}/confirmar`, {}, comFeedbackProprioEErroTratado());
  }

  ajustar(id: number, dto: PropostaIaAjustarDto): Observable<StandardResponse<PropostaIaAjustadaDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaAjustadaDto>>(`${this.urlBase}/${id}/ajustar`, dto, comFeedbackProprioEErroTratado());
  }

  recusar(id: number): Observable<StandardResponse<PropostaIaRecusadaDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaRecusadaDto>>(`${this.urlBase}/${id}/recusar`, {}, comFeedbackProprioEErroTratado());
  }

  desfazer(id: number): Observable<StandardResponse<PropostaIaDesfeitaDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaDesfeitaDto>>(`${this.urlBase}/${id}/desfazer`, {}, comFeedbackProprioEErroTratado());
  }
}
