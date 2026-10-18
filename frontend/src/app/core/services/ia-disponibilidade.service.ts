import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
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

  /** Consulta o estado agora (guardando no sinal) e o devolve, ou `null` se a consulta falhar: o login decide o destino por ele. */
  consultar(): Observable<EstadoIaEnum | null> {
    return this.httpClient.get<StandardResponse<IaEstadoRecuperadoDto>>(`${ambiente.apiUrl}/ia/disponibilidade`, comFeedbackProprio()).pipe(
      tap((resposta) => {
        if (resposta.dados) this.estado.set(resposta.dados.estado);
      }),
      map((resposta) => resposta.dados?.estado ?? null),
      catchError(() => of(null)),
    );
  }

  carregar(): void {
    this.httpClient
      .get<StandardResponse<IaEstadoRecuperadoDto>>(`${ambiente.apiUrl}/ia/disponibilidade`, comFeedbackProprio())
      .pipe(catchError(() => of(null)))
      .subscribe((resposta) => {
        if (resposta?.dados) this.estado.set(resposta.dados.estado);
      });
  }
}
