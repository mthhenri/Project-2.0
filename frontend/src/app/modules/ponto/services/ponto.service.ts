import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PontoConsultarDto,
  PontoDiarioDto,
  PontoMensalConsultarDto,
  PontoMensalDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PontoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/ponto`;

  consultarDiario(filtros: PontoConsultarDto): Observable<StandardResponse<PontoDiarioDto>> {
    let params = new HttpParams().set('data', filtros.data);
    if (filtros.usuarioId) params = params.set('usuarioId', String(filtros.usuarioId));
    return this.httpClient.get<StandardResponse<PontoDiarioDto>>(`${this.urlBase}/diario`, { params });
  }

  consultarTodos(data: string): Observable<StandardResponse<PontoDiarioDto[]>> {
    const params = new HttpParams().set('data', data);
    return this.httpClient.get<StandardResponse<PontoDiarioDto[]>>(`${this.urlBase}/todos`, { params });
  }

  consultarMensal(filtros: PontoMensalConsultarDto): Observable<StandardResponse<PontoMensalDto>> {
    let params = new HttpParams()
      .set('ano', String(filtros.ano))
      .set('mes', String(filtros.mes));
    if (filtros.usuarioId) params = params.set('usuarioId', String(filtros.usuarioId));
    return this.httpClient.get<StandardResponse<PontoMensalDto>>(`${this.urlBase}/mensal`, { params });
  }
}
