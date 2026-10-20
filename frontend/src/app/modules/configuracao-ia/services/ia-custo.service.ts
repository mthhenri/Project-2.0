import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IaCustoConsultadoDto, IaCustoConsultarDto, IaModeloPrecoAlteradoDto, IaModeloPrecoAlterarDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** Custos da IA (aba "Custos"): consulta por mês ou por ano e preço por modelo. Rotas exclusivas de administrador. */
@Injectable({ providedIn: 'root' })
export class IaCustoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/ia-custo`;

  consultar(dto: IaCustoConsultarDto): Observable<StandardResponse<IaCustoConsultadoDto>> {
    let params = new HttpParams().set('ano', String(dto.ano));
    if (dto.mes !== undefined) params = params.set('mes', String(dto.mes));
    return this.httpClient.get<StandardResponse<IaCustoConsultadoDto>>(this.urlBase, { params, ...comFeedbackProprio() });
  }

  /** O preço salvo na linha da tabela é uma ação local dela (botão com loading), então não liga o overlay da tela toda. */
  alterarPreco(dto: IaModeloPrecoAlterarDto): Observable<StandardResponse<IaModeloPrecoAlteradoDto>> {
    return this.httpClient.put<StandardResponse<IaModeloPrecoAlteradoDto>>(`${this.urlBase}/preco`, dto, comFeedbackProprio());
  }
}
