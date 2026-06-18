import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AtividadeCriarDto,
  AtividadeCriadaDto,
  AtividadeListarDto,
  AtividadeResumoDto,
  AtividadeRecuperadaDto,
  AtividadeAlterarDto,
  AtividadeAlteradaDto,
  AtividadeTagsAtribuirDto,
  TagResumoDto,
  ExecucaoIniciarDto,
  ExecucaoIniciadaDto,
  ExecucaoEncerrarDto,
  ExecucaoEncerradaDto,
  ExecucaoResumoDto,
  ExecucaoAtivaDto,
  StandardResponse,
  PaginatedResult,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AtividadeService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/atividade`;
  private readonly urlExecucao = `${ambiente.apiUrl}/execucao`;

  listar(filtros: AtividadeListarDto): Observable<StandardResponse<PaginatedResult<AtividadeResumoDto>>> {
    let params = new HttpParams();
    if (filtros.demandaId)      params = params.set('demandaId', String(filtros.demandaId));
    if (filtros.usuarioId)      params = params.set('usuarioId', String(filtros.usuarioId));
    if (filtros.status?.length) {
      for (const status of filtros.status) params = params.append('status', status);
    }
    if (filtros.busca)          params = params.set('busca', filtros.busca);
    if (filtros.dataInicio)     params = params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim)        params = params.set('dataFim', filtros.dataFim);
    if (filtros.pagina)         params = params.set('pagina', String(filtros.pagina));
    if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
    return this.httpClient.get<StandardResponse<PaginatedResult<AtividadeResumoDto>>>(this.urlBase, { params });
  }

  criar(dto: AtividadeCriarDto): Observable<StandardResponse<AtividadeCriadaDto>> {
    return this.httpClient.post<StandardResponse<AtividadeCriadaDto>>(this.urlBase, dto);
  }

  recuperar(id: number): Observable<StandardResponse<AtividadeRecuperadaDto>> {
    return this.httpClient.get<StandardResponse<AtividadeRecuperadaDto>>(`${this.urlBase}/${id}`);
  }

  alterar(id: number, dto: AtividadeAlterarDto): Observable<StandardResponse<AtividadeAlteradaDto>> {
    return this.httpClient.put<StandardResponse<AtividadeAlteradaDto>>(`${this.urlBase}/${id}`, dto);
  }

  excluir(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`);
  }

  alterarTags(id: number, dto: AtividadeTagsAtribuirDto): Observable<StandardResponse<void>> {
    return this.httpClient.put<StandardResponse<void>>(`${this.urlBase}/${id}/tag`, dto);
  }

  listarTags(id: number): Observable<StandardResponse<TagResumoDto[]>> {
    return this.httpClient.get<StandardResponse<TagResumoDto[]>>(`${this.urlBase}/${id}/tag`);
  }

  // --- Execução (fluxo play/pause na própria listagem; o módulo execução é da task 28) ---

  recuperarExecucaoAtiva(): Observable<StandardResponse<ExecucaoAtivaDto | null>> {
    return this.httpClient.get<StandardResponse<ExecucaoAtivaDto | null>>(`${this.urlExecucao}/ativa`);
  }

  iniciarExecucao(dto: ExecucaoIniciarDto): Observable<StandardResponse<ExecucaoIniciadaDto>> {
    return this.httpClient.post<StandardResponse<ExecucaoIniciadaDto>>(this.urlExecucao, dto);
  }

  encerrarExecucao(id: number, dto: ExecucaoEncerrarDto): Observable<StandardResponse<ExecucaoEncerradaDto>> {
    return this.httpClient.patch<StandardResponse<ExecucaoEncerradaDto>>(`${this.urlExecucao}/${id}/encerrar`, dto);
  }

  listarExecucoesPorAtividade(atividadeId: number): Observable<StandardResponse<PaginatedResult<ExecucaoResumoDto>>> {
    const params = new HttpParams()
      .set('atividadeId', String(atividadeId))
      .set('itensPorPagina', '200');
    return this.httpClient.get<StandardResponse<PaginatedResult<ExecucaoResumoDto>>>(this.urlExecucao, { params });
  }
}
