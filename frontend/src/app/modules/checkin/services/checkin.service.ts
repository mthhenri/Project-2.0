import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay } from 'rxjs';
import { CheckinSituacaoConsultadaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** Situação do check-in do próprio usuário (a conversa em si usa o `ChatService`, na rota `/checkin/mensagem`). */
@Injectable({ providedIn: 'root' })
export class CheckinService {
    private readonly httpClient = inject(HttpClient);
    private consultaEmCurso$: Observable<StandardResponse<CheckinSituacaoConsultadaDto>> | null = null;

    /** Quem pede enquanto outra consulta está a caminho recebe a mesma resposta, sem outra requisição (P-081). Resposta já concluída nunca é reaproveitada. */
    consultarSituacao(): Observable<StandardResponse<CheckinSituacaoConsultadaDto>> {
        if (!this.consultaEmCurso$) {
            this.consultaEmCurso$ = this.httpClient
                .get<StandardResponse<CheckinSituacaoConsultadaDto>>(`${ambiente.apiUrl}/checkin/situacao`, comFeedbackProprio())
                .pipe(
                    finalize(() => (this.consultaEmCurso$ = null)),
                    shareReplay({ bufferSize: 1, refCount: false }),
                );
        }
        return this.consultaEmCurso$;
    }
}
