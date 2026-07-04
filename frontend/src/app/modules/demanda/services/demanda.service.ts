import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaListarDto,
  DemandaResumoDto,
  DemandaRecuperadaDto,
  DemandaAlterarDto,
  DemandaAlteradaDto,
  DemandaGrafoDto,
  DemandaArvoreItemDto,
  DemandaAncestralDto,
  DemandaConexaoCriarDto,
  DemandaConexaoCriadaDto,
  DemandaConexaoResumoDto,
  DemandaTagsAtribuirDto,
  DemandaMembroDto,
  DemandaUsuarioAtribuirDto,
  DemandaAtribuidaDto,
  DemandaPlanejamentoDto,
  TagResumoDto,
  StandardResponse,
  PaginatedResult,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DemandaService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/demanda`;

  listar(filtros: DemandaListarDto): Observable<StandardResponse<PaginatedResult<DemandaResumoDto>>> {
    let params = new HttpParams();
    if (filtros.projetoId) params = params.set('projetoId', String(filtros.projetoId));
    if (filtros.pagina)    params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    if (filtros.status)    params = params.set('status', filtros.status);
    if (filtros.isEstrutural !== undefined) params = params.set('isEstrutural', String(filtros.isEstrutural));
    return this.httpClient.get<StandardResponse<PaginatedResult<DemandaResumoDto>>>(this.urlBase, { params });
  }

  listarAtribuidas(): Observable<StandardResponse<DemandaAtribuidaDto[]>> {
    return this.httpClient.get<StandardResponse<DemandaAtribuidaDto[]>>(`${this.urlBase}/atribuidas`);
  }

  recuperarGrafo(projetoId: number): Observable<StandardResponse<DemandaGrafoDto>> {
    const params = new HttpParams().set('projetoId', String(projetoId));
    return this.httpClient.get<StandardResponse<DemandaGrafoDto>>(`${this.urlBase}/grafo`, { params });
  }

  listarPlanejamento(projetoId: number): Observable<StandardResponse<DemandaPlanejamentoDto[]>> {
    const params = new HttpParams().set('projetoId', String(projetoId));
    return this.httpClient.get<StandardResponse<DemandaPlanejamentoDto[]>>(`${this.urlBase}/planejamento`, { params });
  }

  criar(dto: DemandaCriarDto): Observable<StandardResponse<DemandaCriadaDto>> {
    return this.httpClient.post<StandardResponse<DemandaCriadaDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<DemandaRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<DemandaRecuperadaDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: DemandaAlterarDto): Observable<StandardResponse<DemandaAlteradaDto>> {
    return this.httpClient.put<StandardResponse<DemandaAlteradaDto>>(`${this.urlBase}/${id}`, dto);
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  recuperarArvore(id: number): Observable<StandardResponse<DemandaArvoreItemDto>> {
    return this.httpClient.get<StandardResponse<DemandaArvoreItemDto>>(`${this.urlBase}/${id}/arvore`);
  }

  recuperarAncestral(id: number): Observable<StandardResponse<DemandaAncestralDto[]>> {
    return this.httpClient.get<StandardResponse<DemandaAncestralDto[]>>(`${this.urlBase}/${id}/ancestral`);
  }

  criarConexao(demandaId: number, dto: DemandaConexaoCriarDto): Observable<StandardResponse<DemandaConexaoCriadaDto>> {
    return this.httpClient.post<StandardResponse<DemandaConexaoCriadaDto>>(`${this.urlBase}/${demandaId}/conexao`, dto);
  }

  listarConexoes(demandaId: number): Observable<StandardResponse<DemandaConexaoResumoDto[]>> {
    return this.httpClient.get<StandardResponse<DemandaConexaoResumoDto[]>>(`${this.urlBase}/${demandaId}/conexao`);
  }

  excluirConexao(demandaId: number, conexaoId: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${demandaId}/conexao/${conexaoId}`);
  }

  listarTags(demandaId: number): Observable<StandardResponse<TagResumoDto[]>> {
    return this.httpClient.get<StandardResponse<TagResumoDto[]>>(`${this.urlBase}/${demandaId}/tag`);
  }

  alterarTags(demandaId: number, dto: DemandaTagsAtribuirDto): Observable<StandardResponse<void>> {
    return this.httpClient.put<StandardResponse<void>>(`${this.urlBase}/${demandaId}/tag`, dto);
  }

  listarMembros(demandaId: number): Observable<StandardResponse<DemandaMembroDto[]>> {
    return this.httpClient.get<StandardResponse<DemandaMembroDto[]>>(`${this.urlBase}/${demandaId}/membro`);
  }

  atribuirMembro(demandaId: number, dto: DemandaUsuarioAtribuirDto): Observable<StandardResponse<void>> {
    return this.httpClient.post<StandardResponse<void>>(`${this.urlBase}/${demandaId}/membro`, dto);
  }

  removerMembro(demandaId: number, usuarioId: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${demandaId}/membro/${usuarioId}`);
  }
}
