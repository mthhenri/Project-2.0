import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProjetoCriarDto,
  ProjetoCriadoDto,
  ProjetoListarDto,
  ProjetoResumoDto,
  ProjetoRecuperadoDto,
  ProjetoAlterarDto,
  ProjetoAlteradoDto,
  StandardResponse,
  PaginatedResult,
  ProjetoRestauradoDto,
  ProjetoVolumeListarDto,
  ProjetoVolumeResumoDto,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

@Injectable({ providedIn: 'root' })
export class ProjetoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/projeto`;

  listar(filtros: ProjetoListarDto): Observable<StandardResponse<PaginatedResult<ProjetoResumoDto>>> {
    let params = new HttpParams();
    if (filtros.status) params = params.set('status', filtros.status);
    if (filtros.pagina) params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    if (filtros.allRows) params = params.set('allRows', 'true');
    return this.httpClient.get<StandardResponse<PaginatedResult<ProjetoResumoDto>>>(this.urlBase, { params, ...comFeedbackProprio() });
  }

  /** Volume do mês por projeto (gestor): horas gastas × esperadas. */
  listarVolume(filtros: ProjetoVolumeListarDto): Observable<StandardResponse<ProjetoVolumeResumoDto[]>> {
    const params = new HttpParams().set('ano', String(filtros.ano)).set('mes', String(filtros.mes));
    return this.httpClient.get<StandardResponse<ProjetoVolumeResumoDto[]>>(`${this.urlBase}/volume`, { params, ...comFeedbackProprio() });
  }

  criar(dto: ProjetoCriarDto): Observable<StandardResponse<ProjetoCriadoDto>> {
    return this.httpClient.post<StandardResponse<ProjetoCriadoDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<ProjetoRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<ProjetoRecuperadoDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: ProjetoAlterarDto): Observable<StandardResponse<ProjetoAlteradoDto>> {
    return this.httpClient.put<StandardResponse<ProjetoAlteradoDto>>(`${this.urlBase}/${id}`, dto);
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  /** Desfaz o soft delete ("Desfazer" do toast de exclusão). */
  restaurar(id: number): Observable<StandardResponse<ProjetoRestauradoDto>> {
    return this.httpClient.patch<StandardResponse<ProjetoRestauradoDto>>(`${this.urlBase}/${id}/restaurar`, {});
  }
}
