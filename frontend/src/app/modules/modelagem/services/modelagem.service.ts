import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ModelagemDiagramaDto,
  ModelagemGrupoAlterarDto,
  ModelagemGrupoAlteradoDto,
  ModelagemGrupoCriadoDto,
  ModelagemGrupoCriarDto,
  ModelagemTabelaAlterarDto,
  ModelagemTabelaAlteradaDto,
  StandardResponse,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/** O diagrama do banco (qualquer usuário autenticado vê) e os grupos e posições das tabelas (só o gestor altera). */
@Injectable({ providedIn: 'root' })
export class ModelagemService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/modelagem`;

  obterDiagrama(): Observable<StandardResponse<ModelagemDiagramaDto>> {
    return this.httpClient.get<StandardResponse<ModelagemDiagramaDto>>(this.urlBase, comFeedbackProprio());
  }

  criarGrupo(dto: ModelagemGrupoCriarDto): Observable<StandardResponse<ModelagemGrupoCriadoDto>> {
    return this.httpClient.post<StandardResponse<ModelagemGrupoCriadoDto>>(`${this.urlBase}/grupo`, dto);
  }

  alterarGrupo(id: number, dto: ModelagemGrupoAlterarDto): Observable<StandardResponse<ModelagemGrupoAlteradoDto>> {
    return this.httpClient.put<StandardResponse<ModelagemGrupoAlteradoDto>>(`${this.urlBase}/grupo/${id}`, dto);
  }

  excluirGrupo(id: number): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/grupo/${id}`);
  }

  /** Põe a tabela na modelagem ou muda o grupo e/ou a posição dela. Sem feedback global: o arrasto salva a cada solta e não deve piscar o carregando. */
  alterarTabela(nomeTabela: string, dto: ModelagemTabelaAlterarDto): Observable<StandardResponse<ModelagemTabelaAlteradaDto>> {
    return this.httpClient.put<StandardResponse<ModelagemTabelaAlteradaDto>>(`${this.urlBase}/tabela/${encodeURIComponent(nomeTabela)}`, dto, comFeedbackProprio());
  }

  /** Tira a tabela da modelagem: só o desenho muda, a tabela do banco continua e vai para o canto ("Fora da modelagem"). */
  removerTabela(nomeTabela: string): Observable<StandardResponse<void>> {
    return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/tabela/${encodeURIComponent(nomeTabela)}`);
  }
}
