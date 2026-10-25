import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PropostaIaAjustadaDto,
  PropostaIaAjustarDto,
  PropostaIaConfirmadaDto,
  PropostaIaDesfeitaDto,
  PropostaIaGrupoConfirmadoDto,
  PropostaIaGrupoConfirmarDto,
  PropostaIaGrupoDesfazerDto,
  PropostaIaGrupoDesfeitoDto,
  PropostaIaGrupoRecusadoDto,
  PropostaIaGrupoRecusarDto,
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

  /** As três ações do grupo (task 227): uma chamada só, e o resultado diz o que aconteceu com cada proposta. */
  confirmarGrupo(dto: PropostaIaGrupoConfirmarDto): Observable<StandardResponse<PropostaIaGrupoConfirmadoDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaGrupoConfirmadoDto>>(`${this.urlBase}/grupo/confirmar`, dto, comFeedbackProprioEErroTratado());
  }

  recusarGrupo(dto: PropostaIaGrupoRecusarDto): Observable<StandardResponse<PropostaIaGrupoRecusadoDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaGrupoRecusadoDto>>(`${this.urlBase}/grupo/recusar`, dto, comFeedbackProprioEErroTratado());
  }

  desfazerGrupo(dto: PropostaIaGrupoDesfazerDto): Observable<StandardResponse<PropostaIaGrupoDesfeitoDto>> {
    return this.httpClient.post<StandardResponse<PropostaIaGrupoDesfeitoDto>>(`${this.urlBase}/grupo/desfazer`, dto, comFeedbackProprioEErroTratado());
  }
}
