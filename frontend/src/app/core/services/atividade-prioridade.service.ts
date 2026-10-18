import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AtividadePrioridadeCorAlteradaDto,
  AtividadePrioridadeCorAlterarDto,
  AtividadePrioridadeResumoDto,
  StandardResponse,
  TipoAtividadePrioridadeEnum,
} from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comFeedbackProprio } from '../interceptors/loading.interceptor';

/**
 * Prioridades da atividade (task 143). A lista é pequena e quase imutável, então fica em cache num sinal: as telas pedem `carregar()`
 * (uma vez) e leem `prioridades()`; trocar a cor (só administrador) atualiza o cache e, com ele, todos os selos abertos.
 */
@Injectable({ providedIn: 'root' })
export class AtividadePrioridadeService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/atividade-prioridade`;
  private carregada = false;

  readonly prioridades = signal<AtividadePrioridadeResumoDto[]>([]);

  /** Busca as prioridades na primeira chamada; `forcar` busca de novo (depois de um erro). */
  carregar(forcar = false): void {
    if (this.carregada && !forcar) return;
    this.carregada = true;
    this.httpClient.get<StandardResponse<AtividadePrioridadeResumoDto[]>>(this.urlBase, comFeedbackProprio()).subscribe({
      next: (resposta) => this.prioridades.set(resposta.dados ?? []),
      error: () => (this.carregada = false),
    });
  }

  alterarCor(codigo: TipoAtividadePrioridadeEnum, dto: AtividadePrioridadeCorAlterarDto): Observable<StandardResponse<AtividadePrioridadeCorAlteradaDto>> {
    return this.httpClient.patch<StandardResponse<AtividadePrioridadeCorAlteradaDto>>(`${this.urlBase}/${codigo}`, dto).pipe(
      tap((resposta) => {
        const alterada = resposta.dados;
        if (alterada) this.prioridades.update((lista) => lista.map((item) => (item.codigo === alterada.codigo ? alterada : item)));
      }),
    );
  }
}
