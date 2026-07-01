import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RelatorioExecucaoDto,
  RelatorioRevisaoDto,
  RelatorioPeriodoTipoEnum,
  RelatorioFormatoEnum,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

/** Parâmetros de período resolvidos no componente antes de chamar a API. */
export interface RelatorioParametros {
  projetoId: number;
  periodoTipo: RelatorioPeriodoTipoEnum;
  ano?: number;
  mes?: number;
  dataInicio?: string;
  dataFim?: string;
}

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/relatorio`;

  gerarRelatorio(params: RelatorioParametros): Observable<StandardResponse<RelatorioExecucaoDto>> {
    return this.httpClient.get<StandardResponse<RelatorioExecucaoDto>>(`${this.urlBase}/execucao`, {
      params: this.montarParams(params),
    });
  }

  baixarRelatorio(
    params: RelatorioParametros,
    formato: RelatorioFormatoEnum,
  ): Observable<HttpResponse<Blob>> {
    const httpParams = this.montarParams(params).set('formato', formato);
    return this.httpClient.get(`${this.urlBase}/execucao/download`, {
      params: httpParams,
      responseType: 'blob',
      observe: 'response',
    });
  }

  revisarRelatorio(params: RelatorioParametros): Observable<StandardResponse<RelatorioRevisaoDto>> {
    const httpParams = new HttpParams().set('projetoId', String(params.projetoId));
    return this.httpClient.post<StandardResponse<RelatorioRevisaoDto>>(
      `${this.urlBase}/execucao/revisar`,
      this.montarCorpo(params),
      { params: httpParams },
    );
  }

  private montarParams(params: RelatorioParametros): HttpParams {
    let httpParams = new HttpParams()
      .set('projetoId', String(params.projetoId))
      .set('periodoTipo', params.periodoTipo);
    if (params.ano !== undefined) httpParams = httpParams.set('ano', String(params.ano));
    if (params.mes !== undefined) httpParams = httpParams.set('mes', String(params.mes));
    if (params.dataInicio) httpParams = httpParams.set('dataInicio', params.dataInicio);
    if (params.dataFim) httpParams = httpParams.set('dataFim', params.dataFim);
    return httpParams;
  }

  private montarCorpo(params: RelatorioParametros): Record<string, unknown> {
    const corpo: Record<string, unknown> = { periodoTipo: params.periodoTipo };
    if (params.ano !== undefined) corpo['ano'] = params.ano;
    if (params.mes !== undefined) corpo['mes'] = params.mes;
    if (params.dataInicio) corpo['dataInicio'] = params.dataInicio;
    if (params.dataFim) corpo['dataFim'] = params.dataFim;
    return corpo;
  }
}
