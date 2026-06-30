import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ExecucaoIniciarDto,
  ExecucaoIniciadaDto,
  ExecucaoEncerrarDto,
  ExecucaoEncerradaDto,
  ExecucaoAlterarDto,
  ExecucaoAlteradaDto,
  ExecucaoListarDto,
  ExecucaoResumoDto,
  ExecucaoAtivaDto,
  ExecucaoRegistrarDto,
  ExecucaoRegistradaDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExecucaoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/execucao`;

  iniciar(dto: ExecucaoIniciarDto): Observable<StandardResponse<ExecucaoIniciadaDto>> {
    return this.httpClient.post<StandardResponse<ExecucaoIniciadaDto>>(this.urlBase, dto);
  }

  registrar(dto: ExecucaoRegistrarDto): Observable<StandardResponse<ExecucaoRegistradaDto>> {
    return this.httpClient.post<StandardResponse<ExecucaoRegistradaDto>>(`${this.urlBase}/registro`, dto);
  }

  encerrar(id: number, dto: ExecucaoEncerrarDto): Observable<StandardResponse<ExecucaoEncerradaDto>> {
    return this.httpClient.patch<StandardResponse<ExecucaoEncerradaDto>>(`${this.urlBase}/${id}/encerrar`, dto);
  }

  listar(filtros: ExecucaoListarDto): Observable<StandardResponse<ExecucaoResumoDto>> {
    let params = new HttpParams();
    if (filtros.atividadeId)    params = params.set('atividadeId', String(filtros.atividadeId));
    if (filtros.usuarioId)      params = params.set('usuarioId', String(filtros.usuarioId));
    if (filtros.data)           params = params.set('data', filtros.data);
    if (filtros.pagina)         params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    return this.httpClient.get<StandardResponse<ExecucaoResumoDto>>(this.urlBase, { params });
  }

  recuperar(id: number): Observable<StandardResponse<ExecucaoEncerradaDto>> {
    return this.httpClient.get<StandardResponse<ExecucaoEncerradaDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: ExecucaoAlterarDto): Observable<StandardResponse<ExecucaoAlteradaDto>> {
    return this.httpClient.put<StandardResponse<ExecucaoAlteradaDto>>(`${this.urlBase}/${id}`, dto);
  }

  buscarAtiva(): Observable<StandardResponse<ExecucaoAtivaDto | null>> {
    return this.httpClient.get<StandardResponse<ExecucaoAtivaDto | null>>(`${this.urlBase}/ativa`);
  }
}
