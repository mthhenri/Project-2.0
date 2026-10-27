import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssistenteTrechoAlteradoDto, AssistenteTrechoAlterarDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/** O "alterar trecho com IA" da tela de Documentações (task 260): pede à IA o bloco com só a seleção alterada; nada é gravado. */
@Injectable({ providedIn: 'root' })
export class AssistenteTrechoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/assistente`;

  /** O erro (IA fora do ar, resposta que não encaixa) não gera toast: o cartão da proposta o mostra. */
  alterarTrecho(dto: AssistenteTrechoAlterarDto): Observable<StandardResponse<AssistenteTrechoAlteradoDto>> {
    return this.httpClient.post<StandardResponse<AssistenteTrechoAlteradoDto>>(`${this.urlBase}/alterar-trecho`, dto, comFeedbackProprioEErroTratado());
  }
}
