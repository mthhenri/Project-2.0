import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ConfiguracaoIaCriadaDto,
  ConfiguracaoIaCriarDto,
  ConfiguracaoIaRecuperadaDto,
  ConfiguracaoIaResumoDto,
  IaEstadoCompletoRecuperadoDto,
  PaginatedResult,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** Configuração da IA e estado dela (rotas exclusivas de administrador). */
@Injectable({ providedIn: 'root' })
export class ConfiguracaoIaService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/configuracao-ia`;

  recuperarAtiva(): Observable<StandardResponse<ConfiguracaoIaRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<ConfiguracaoIaRecuperadaDto>>(this.urlBase, comFeedbackProprio());
  }

  listarVersoes(itensPorPagina = 50): Observable<StandardResponse<PaginatedResult<ConfiguracaoIaResumoDto>>> {
    const params = new HttpParams().set('itensPorPagina', String(itensPorPagina));
    return this.httpClient.get<StandardResponse<PaginatedResult<ConfiguracaoIaResumoDto>>>(`${this.urlBase}/versoes`, {
      params,
      ...comFeedbackProprio(),
    });
  }

  /** Grava uma versão nova (a antiga nunca é alterada). */
  criar(dto: ConfiguracaoIaCriarDto): Observable<StandardResponse<ConfiguracaoIaCriadaDto>> {
    return this.httpClient.post<StandardResponse<ConfiguracaoIaCriadaDto>>(this.urlBase, dto);
  }

  recuperarEstado(): Observable<StandardResponse<IaEstadoCompletoRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<IaEstadoCompletoRecuperadoDto>>(`${ambiente.apiUrl}/ia/estado`, comFeedbackProprio());
  }
}
