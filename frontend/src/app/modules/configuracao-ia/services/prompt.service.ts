import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaginatedResult,
  PromptPadraoRestauradoDto,
  PromptRascunhoAtivadoDto,
  PromptRascunhoSalvarDto,
  PromptRascunhoSalvoDto,
  PromptResumoDto,
  PromptTipoResumoDto,
  StandardResponse,
  TipoPromptEnum,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** Prompts da IA (rotas exclusivas de administrador). */
@Injectable({ providedIn: 'root' })
export class PromptService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/prompt`;

  listarTipos(): Observable<StandardResponse<PromptTipoResumoDto[]>> {
    return this.httpClient.get<StandardResponse<PromptTipoResumoDto[]>>(this.urlBase, comFeedbackProprio());
  }

  listarVersoes(tipo: TipoPromptEnum, itensPorPagina = 50): Observable<StandardResponse<PaginatedResult<PromptResumoDto>>> {
    const params = new HttpParams().set('itensPorPagina', String(itensPorPagina));
    return this.httpClient.get<StandardResponse<PaginatedResult<PromptResumoDto>>>(`${this.urlBase}/${tipo}/versoes`, {
      params,
      ...comFeedbackProprio(),
    });
  }

  salvarRascunho(tipo: TipoPromptEnum, dto: PromptRascunhoSalvarDto): Observable<StandardResponse<PromptRascunhoSalvoDto>> {
    return this.httpClient.post<StandardResponse<PromptRascunhoSalvoDto>>(`${this.urlBase}/${tipo}/rascunho`, dto);
  }

  ativarRascunho(tipo: TipoPromptEnum): Observable<StandardResponse<PromptRascunhoAtivadoDto>> {
    return this.httpClient.post<StandardResponse<PromptRascunhoAtivadoDto>>(`${this.urlBase}/${tipo}/rascunho/ativar`, {});
  }

  restaurarPadrao(tipo: TipoPromptEnum): Observable<StandardResponse<PromptPadraoRestauradoDto>> {
    return this.httpClient.post<StandardResponse<PromptPadraoRestauradoDto>>(`${this.urlBase}/${tipo}/restaurar-padrao`, {});
  }

  descartarRascunho(tipo: TipoPromptEnum): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${tipo}/rascunho`);
  }
}
