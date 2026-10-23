import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModelagemDiagramaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** O diagrama do banco, montado pelo backend do catálogo do PostgreSQL (qualquer usuário autenticado). */
@Injectable({ providedIn: 'root' })
export class ModelagemService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/modelagem`;

  obterDiagrama(): Observable<StandardResponse<ModelagemDiagramaDto>> {
    return this.httpClient.get<StandardResponse<ModelagemDiagramaDto>>(this.urlBase, comFeedbackProprio());
  }
}
