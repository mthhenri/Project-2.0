import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TagCriarDto,
  TagCriadaDto,
  TagResumoDto,
  TagRecuperadaDto,
  TagAlterarDto,
  TagAlteradaDto,
  StandardResponse,
  TagRestauradaDto,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/tag`;

  listar(): Observable<StandardResponse<TagResumoDto[]>> {
    return this.httpClient.get<StandardResponse<TagResumoDto[]>>(this.urlBase, comFeedbackProprio());
  }

  criar(dto: TagCriarDto): Observable<StandardResponse<TagCriadaDto>> {
    return this.httpClient.post<StandardResponse<TagCriadaDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<TagRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<TagRecuperadaDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: TagAlterarDto): Observable<StandardResponse<TagAlteradaDto>> {
    return this.httpClient.put<StandardResponse<TagAlteradaDto>>(`${this.urlBase}/${id}`, dto);
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  /** Desfaz o soft delete ("Desfazer" do toast de exclusão). */
  restaurar(id: number): Observable<StandardResponse<TagRestauradaDto>> {
    return this.httpClient.patch<StandardResponse<TagRestauradaDto>>(`${this.urlBase}/${id}/restaurar`, {});
  }
}
