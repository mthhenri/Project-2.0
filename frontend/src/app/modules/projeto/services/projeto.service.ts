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
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjetoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/projeto`;

  listar(filtros: ProjetoListarDto): Observable<StandardResponse<PaginatedResult<ProjetoResumoDto>>> {
    let params = new HttpParams();
    if (filtros.status) params = params.set('status', filtros.status);
    if (filtros.pagina) params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    return this.httpClient.get<StandardResponse<PaginatedResult<ProjetoResumoDto>>>(this.urlBase, { params });
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
}
