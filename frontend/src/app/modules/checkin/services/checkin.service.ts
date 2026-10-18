import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CheckinSituacaoConsultadaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** Situação do check-in do próprio usuário (a conversa em si usa o `ChatService`, na rota `/checkin/mensagem`). */
@Injectable({ providedIn: 'root' })
export class CheckinService {
  private readonly httpClient = inject(HttpClient);

  consultarSituacao(): Observable<StandardResponse<CheckinSituacaoConsultadaDto>> {
    return this.httpClient.get<StandardResponse<CheckinSituacaoConsultadaDto>>(`${ambiente.apiUrl}/checkin/situacao`, comFeedbackProprio());
  }
}
