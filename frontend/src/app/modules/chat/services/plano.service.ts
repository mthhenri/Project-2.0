import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PlanoAlteradoDto,
  PlanoAlterarDto,
  PlanoArquivadoDto,
  PlanoCriadoDto,
  PlanoCriarDto,
  PlanoDemandaLigadaDto,
  PlanoListarDto,
  PlanoProjetoAtribuidoDto,
  PlanoRecuperadoDto,
  PlanoResumoDto,
  PlanoSoloMarcadoDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio, comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/**
 * API do plano (`/plano`, task 232). Leituras com feedback próprio da tela; as mutações que a tela trata sozinha (gravar o documento, ligar,
 * atribuir projeto) usam `comFeedbackProprioEErroTratado`, para o componente mostrar a falha (409 = versão mais nova) em vez do aviso global.
 */
@Injectable({ providedIn: 'root' })
export class PlanoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/plano`;

  listar(filtros: PlanoListarDto = {}): Observable<StandardResponse<PlanoResumoDto[]>> {
    let params = new HttpParams();
    if (filtros.busca) params = params.set('busca', filtros.busca);
    if (filtros.incluirArquivados) params = params.set('incluirArquivados', 'true');
    if (filtros.projetoId) params = params.set('projetoId', String(filtros.projetoId));
    return this.httpClient.get<StandardResponse<PlanoResumoDto[]>>(this.urlBase, { params, ...comFeedbackProprio() });
  }

  recuperar(id: number): Observable<StandardResponse<PlanoRecuperadoDto>> {
    return this.httpClient.get<StandardResponse<PlanoRecuperadoDto>>(`${this.urlBase}/${id}`, comFeedbackProprio());
  }

  criar(dto: PlanoCriarDto = {}): Observable<StandardResponse<PlanoCriadoDto>> {
    return this.httpClient.post<StandardResponse<PlanoCriadoDto>>(this.urlBase, dto, comFeedbackProprioEErroTratado());
  }

  /** Grava com a versão lida; 409 quando outra pessoa gravou antes. */
  alterar(id: number, dto: PlanoAlterarDto): Observable<StandardResponse<PlanoAlteradoDto>> {
    return this.httpClient.put<StandardResponse<PlanoAlteradoDto>>(`${this.urlBase}/${id}`, dto, comFeedbackProprioEErroTratado());
  }

  marcarSolo(id: number, isSolo: boolean): Observable<StandardResponse<PlanoSoloMarcadoDto>> {
    return this.httpClient.patch<StandardResponse<PlanoSoloMarcadoDto>>(`${this.urlBase}/${id}/solo`, { isSolo }, comFeedbackProprioEErroTratado());
  }

  arquivar(id: number, isArquivado: boolean): Observable<StandardResponse<PlanoArquivadoDto>> {
    return this.httpClient.patch<StandardResponse<PlanoArquivadoDto>>(`${this.urlBase}/${id}/arquivo`, { isArquivado }, comFeedbackProprioEErroTratado());
  }

  ligarDemanda(id: number, demandaId: number): Observable<StandardResponse<PlanoDemandaLigadaDto>> {
    return this.httpClient.put<StandardResponse<PlanoDemandaLigadaDto>>(`${this.urlBase}/${id}/demanda`, { demandaId }, comFeedbackProprioEErroTratado());
  }

  atribuirProjeto(id: number, projetoId: number): Observable<StandardResponse<PlanoProjetoAtribuidoDto>> {
    return this.httpClient.patch<StandardResponse<PlanoProjetoAtribuidoDto>>(
      `${this.urlBase}/${id}/projeto`,
      { projetoId, confirmado: true },
      comFeedbackProprioEErroTratado(),
    );
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`, comFeedbackProprioEErroTratado());
  }
}
