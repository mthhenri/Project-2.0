import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnotacaoAlteradaDto,
  AnotacaoAlterarDto,
  AnotacaoResumoDto,
  AnotacaoTrechoMoverDto,
  AnotacaoTrechoMovidoDto,
  StandardResponse,
  TipoAnotacaoEnum,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/** Seções do pad (task 125). Os erros são tratados pelo drawer, que sabe o que fazer com um 409, e o pad salva sozinho em segundo plano, então o overlay global também fica de fora. */
@Injectable({ providedIn: 'root' })
export class AnotacaoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/anotacao`;

  /** Seções do usuário na ordem de exibição; com `tipos`, só essas. */
  listar(usuarioId: number, tipos?: TipoAnotacaoEnum[]): Observable<StandardResponse<AnotacaoResumoDto[]>> {
    let params = new HttpParams().set('usuarioId', String(usuarioId));
    if (tipos?.length) params = params.set('tipos', tipos.join(','));
    return this.httpClient.get<StandardResponse<AnotacaoResumoDto[]>>(this.urlBase, { params, ...comFeedbackProprioEErroTratado() });
  }

  /** Tira o trecho de uma seção e o põe no fim de outra, atomicamente (400 se ausente/ambíguo, 409 se alguma mudou). */
  moverTrecho(usuarioId: number, dto: AnotacaoTrechoMoverDto): Observable<StandardResponse<AnotacaoTrechoMovidoDto>> {
    return this.httpClient.post<StandardResponse<AnotacaoTrechoMovidoDto>>(`${this.urlBase}/${usuarioId}/mover`, dto, comFeedbackProprioEErroTratado());
  }

  /** Substitui a seção inteira; 409 se ela mudou desde que `updatedDateLido` foi lido. */
  alterar(usuarioId: number, tipo: TipoAnotacaoEnum, dto: AnotacaoAlterarDto): Observable<StandardResponse<AnotacaoAlteradaDto>> {
    return this.httpClient.put<StandardResponse<AnotacaoAlteradaDto>>(`${this.urlBase}/${usuarioId}/${tipo}`, dto, comFeedbackProprioEErroTratado());
  }
}
