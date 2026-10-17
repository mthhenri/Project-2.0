import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UsuarioCriarDto,
  UsuarioCriadoDto,
  UsuarioListarDto,
  UsuarioResumoDto,
  UsuarioRecuperadoDto,
  UsuarioAlterarDto,
  UsuarioAlteradoDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
  StandardResponse,
  PaginatedResult,
  UsuarioRestauradoDto,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comErroTratadoPelaTela } from '../../../core/interceptors/error-handler.interceptor';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/usuario`;

  listar(filtros: UsuarioListarDto): Observable<StandardResponse<PaginatedResult<UsuarioResumoDto>>> {
    let params = new HttpParams();
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.status) params = params.set('status', filtros.status);
    if (filtros.busca) params = params.set('busca', filtros.busca);
    if (filtros.pagina) params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    if (filtros.allRows) params = params.set('allRows', 'true');
    return this.httpClient.get<StandardResponse<PaginatedResult<UsuarioResumoDto>>>(this.urlBase, { params, ...comFeedbackProprio() });
  }

  criar(dto: UsuarioCriarDto): Observable<StandardResponse<UsuarioCriadoDto>> {
    return this.httpClient.post<StandardResponse<UsuarioCriadoDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<UsuarioRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<UsuarioRecuperadoDto>>(`${this.urlBase}/${id}`);
  }

  /** `erroNaTela`: a tela mostra a falha por conta própria (ex.: o drawer de anotações), sem o toast genérico. */
  alterar(id: number, dto: UsuarioAlterarDto, erroNaTela = false): Observable<StandardResponse<UsuarioAlteradoDto>> {
    return this.httpClient.put<StandardResponse<UsuarioAlteradoDto>>(`${this.urlBase}/${id}`, dto, erroNaTela ? comErroTratadoPelaTela() : {});
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  /** Desfaz o soft delete ("Desfazer" do toast de exclusão). */
  restaurar(id: number): Observable<StandardResponse<UsuarioRestauradoDto>> {
    return this.httpClient.patch<StandardResponse<UsuarioRestauradoDto>>(`${this.urlBase}/${id}/restaurar`, {});
  }

  alterarSenha(id: number, dto: UsuarioSenhaAlterarDto): Observable<StandardResponse<UsuarioSenhaAlteradaDto>> {
    return this.httpClient.patch<StandardResponse<UsuarioSenhaAlteradaDto>>(`${this.urlBase}/${id}/senha`, dto);
  }
}
