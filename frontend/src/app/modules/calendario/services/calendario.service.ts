import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DiaNaoUtilCriarDto,
  DiaNaoUtilCriadoDto,
  DiaNaoUtilResumoDto,
  DiaNaoUtilAlterarDto,
  DiaNaoUtilAlteradoDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { VerificacaoDiaUtil } from '../models/dia-nao-util.model';

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/calendario`;

  listar(): Observable<StandardResponse<DiaNaoUtilResumoDto[]>> {
    return this.httpClient.get<StandardResponse<DiaNaoUtilResumoDto[]>>(this.urlBase);
  }

  criar(dto: DiaNaoUtilCriarDto): Observable<StandardResponse<DiaNaoUtilCriadoDto>> {
    return this.httpClient.post<StandardResponse<DiaNaoUtilCriadoDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<DiaNaoUtilCriadoDto>> {
    return this.httpClient.get<StandardResponse<DiaNaoUtilCriadoDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: DiaNaoUtilAlterarDto): Observable<StandardResponse<DiaNaoUtilAlteradoDto>> {
    return this.httpClient.put<StandardResponse<DiaNaoUtilAlteradoDto>>(`${this.urlBase}/${id}`, dto);
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  verificarDiaUtil(data: string): Observable<StandardResponse<VerificacaoDiaUtil>> {
    const parametros = new HttpParams().set('data', data);
    return this.httpClient.get<StandardResponse<VerificacaoDiaUtil>>(
      `${this.urlBase}/verificar`,
      { params: parametros },
    );
  }
}
