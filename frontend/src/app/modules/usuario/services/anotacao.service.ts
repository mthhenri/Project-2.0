import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnotacaoAlteradaDto,
  AnotacaoAlterarDto,
  AnotacaoResumoDto,
  StandardResponse,
  TipoAnotacaoEnum,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comErroTratadoPelaTela } from '../../../core/interceptors/error-handler.interceptor';

/** Seções do pad (task 125). Os erros são tratados pelo drawer, que sabe o que fazer com um 409. */
@Injectable({ providedIn: 'root' })
export class AnotacaoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/anotacao`;

  /** Seções do usuário na ordem de exibição; com `tipos`, só essas. */
  listar(usuarioId: number, tipos?: TipoAnotacaoEnum[]): Observable<StandardResponse<AnotacaoResumoDto[]>> {
    let params = new HttpParams().set('usuarioId', String(usuarioId));
    if (tipos?.length) params = params.set('tipos', tipos.join(','));
    return this.httpClient.get<StandardResponse<AnotacaoResumoDto[]>>(this.urlBase, { params, ...comErroTratadoPelaTela() });
  }

  /** Substitui a seção inteira; 409 se ela mudou desde que `updatedDateLido` foi lido. */
  alterar(usuarioId: number, tipo: TipoAnotacaoEnum, dto: AnotacaoAlterarDto): Observable<StandardResponse<AnotacaoAlteradaDto>> {
    return this.httpClient.put<StandardResponse<AnotacaoAlteradaDto>>(`${this.urlBase}/${usuarioId}/${tipo}`, dto, comErroTratadoPelaTela());
  }
}
