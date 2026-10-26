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
  PlanoFonteCriadoDto,
  PlanoFonteExcluidaDto,
  PlanoFonteRecuperadaDto,
  PlanoFonteResumoDto,
  PlanoListarDto,
  PlanoPontoCriadoDto,
  PlanoPontoResumoDto,
  PlanoPontoSituacaoAlteradaDto,
  PlanoProjetoAtribuidoDto,
  PlanoRecuperadoDto,
  PlanoResumoDto,
  PlanoSoloMarcadoDto,
  StandardResponse,
  TipoPlanoFonteOrigemEnum,
  TipoPlanoPontoSituacaoEnum,
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

  /** Os pontos em aberto do plano (task 235): abertos primeiro. */
  listarPontos(planoId: number): Observable<StandardResponse<PlanoPontoResumoDto[]>> {
    return this.httpClient.get<StandardResponse<PlanoPontoResumoDto[]>>(`${this.urlBase}/${planoId}/ponto`, comFeedbackProprio());
  }

  criarPonto(planoId: number, rotulo: string, texto: string): Observable<StandardResponse<PlanoPontoCriadoDto>> {
    return this.httpClient.post<StandardResponse<PlanoPontoCriadoDto>>(`${this.urlBase}/${planoId}/ponto`, { rotulo, texto }, comFeedbackProprioEErroTratado());
  }

  /** Resolve, dispensa, registra a decisão ou reabre; `resolucaoTexto` é a resposta, o motivo ou a decisão. */
  alterarSituacaoDoPonto(planoId: number, pontoId: number, situacao: TipoPlanoPontoSituacaoEnum, resolucaoTexto?: string): Observable<StandardResponse<PlanoPontoSituacaoAlteradaDto>> {
    return this.httpClient.patch<StandardResponse<PlanoPontoSituacaoAlteradaDto>>(
      `${this.urlBase}/${planoId}/ponto/${pontoId}/situacao`,
      { situacao, ...(resolucaoTexto ? { resolucaoTexto } : {}) },
      comFeedbackProprioEErroTratado(),
    );
  }

  /** As fontes (material de fora) do plano (task 236), sem o conteúdo. */
  listarFontes(planoId: number): Observable<StandardResponse<PlanoFonteResumoDto[]>> {
    return this.httpClient.get<StandardResponse<PlanoFonteResumoDto[]>>(`${this.urlBase}/${planoId}/fonte`, comFeedbackProprio());
  }

  recuperarFonte(planoId: number, fonteId: number): Observable<StandardResponse<PlanoFonteRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<PlanoFonteRecuperadaDto>>(`${this.urlBase}/${planoId}/fonte/${fonteId}`, comFeedbackProprioEErroTratado());
  }

  criarFonte(planoId: number, titulo: string, conteudo: string, origem: TipoPlanoFonteOrigemEnum): Observable<StandardResponse<PlanoFonteCriadoDto>> {
    return this.httpClient.post<StandardResponse<PlanoFonteCriadoDto>>(`${this.urlBase}/${planoId}/fonte`, { titulo, conteudo, origem }, comFeedbackProprioEErroTratado());
  }

  excluirFonte(planoId: number, fonteId: number): Observable<StandardResponse<PlanoFonteExcluidaDto>> {
    return this.httpClient.delete<StandardResponse<PlanoFonteExcluidaDto>>(`${this.urlBase}/${planoId}/fonte/${fonteId}`, comFeedbackProprioEErroTratado());
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`, comFeedbackProprioEErroTratado());
  }
}
