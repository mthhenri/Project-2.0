import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EstadoIaEnum, IaEstadoRecuperadoDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comFeedbackProprio } from '../interceptors/loading.interceptor';

/**
 * Estado da IA para qualquer usuário (`GET /ia/disponibilidade`): o chat e a barra lateral leem daqui. Enquanto a IA está "no ar", as
 * telas que o chat substitui ficam desabilitadas; desligada ou fora do ar, elas voltam (fallback da guarda-chuva). `null` até a
 * primeira resposta (por falta de informação, nada fica desabilitado).
 */
@Injectable({ providedIn: 'root' })
export class IaDisponibilidadeService {
  private readonly httpClient = inject(HttpClient);

  readonly estado = signal<EstadoIaEnum | null>(null);

  carregar(): void {
    this.httpClient
      .get<StandardResponse<IaEstadoRecuperadoDto>>(`${ambiente.apiUrl}/ia/disponibilidade`, comFeedbackProprio())
      .pipe(catchError(() => of(null)))
      .subscribe((resposta) => {
        if (resposta?.dados) this.estado.set(resposta.dados.estado);
      });
  }
}
