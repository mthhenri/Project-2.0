import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PontoJustificativaCriarDto,
  PontoJustificativaCriadaDto,
  PontoJustificativaResumoDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PontoJustificativaService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/ponto-justificativa`;

  criar(dto: PontoJustificativaCriarDto): Observable<StandardResponse<PontoJustificativaCriadaDto>> {
    return this.httpClient.post<StandardResponse<PontoJustificativaCriadaDto>>(this.urlBase, dto);
  }

  listar(
    usuarioId: number,
    ano: number,
    mes: number,
  ): Observable<StandardResponse<PontoJustificativaResumoDto[]>> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('ano', String(ano))
      .set('mes', String(mes));
    return this.httpClient.get<StandardResponse<PontoJustificativaResumoDto[]>>(this.urlBase, { params });
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }
}
