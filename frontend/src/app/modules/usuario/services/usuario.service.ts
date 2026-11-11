import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
    UsuarioCriarDto,
    UsuarioCriadoDto,
    UsuarioListarDto,
    UsuarioResumoDto,
    UsuarioRecuperadoDto,
    UsuarioAlterarDto,
    UsuarioAlteradoDto,
    UsuarioSenhaAlterarDto,
    UsuarioCorAlterarDto,
    UsuarioCorAlteradaDto,
    UsuarioSenhaAlteradaDto,
    StandardResponse,
    PaginatedResult,
    UsuarioRestauradoDto,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { CatalogoEmMemoria } from '../../../core/utils/catalogo-em-memoria';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
    private readonly httpClient = inject(HttpClient);
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly urlBase = `${ambiente.apiUrl}/usuario`;

    /** Cópia em memória de todos os usuários para o seletor de membros das demandas (P-080); as gravações abaixo a invalidam. */
    private readonly catalogo = new CatalogoEmMemoria<PaginatedResult<UsuarioResumoDto>>({
        buscar: () => this.listar({ allRows: true }),
        dono: () => this.sessao.id() ?? null,
    });

    listar(filtros: UsuarioListarDto): Observable<StandardResponse<PaginatedResult<UsuarioResumoDto>>> {
        let params = new HttpParams();
        if (filtros.tipo) params = params.set('tipo', filtros.tipo);
        if (filtros.ativo !== undefined) params = params.set('ativo', String(filtros.ativo));
        if (filtros.busca) params = params.set('busca', filtros.busca);
        if (filtros.pagina) params = params.set('pagina', String(filtros.pagina));
        if (filtros.itensPorPagina) params = params.set('itensPorPagina', String(filtros.itensPorPagina));
        if (filtros.allRows) params = params.set('allRows', 'true');
        return this.httpClient.get<StandardResponse<PaginatedResult<UsuarioResumoDto>>>(this.urlBase, { params, ...comFeedbackProprio() });
    }

    /** Todos os usuários para um seletor: da memória enquanto valem (60 s) e até a próxima gravação de usuário feita aqui. */
    listarCatalogo(): Observable<StandardResponse<PaginatedResult<UsuarioResumoDto>>> {
        return this.catalogo.obter();
    }

    criar(dto: UsuarioCriarDto): Observable<StandardResponse<UsuarioCriadoDto>> {
        return this.httpClient.post<StandardResponse<UsuarioCriadoDto>>(this.urlBase, dto).pipe(tap(() => this.catalogo.invalidar()));
    }

    recuperar(id: number): Observable<StandardResponse<UsuarioRecuperadoDto>> {
        return this.httpClient.get<StandardResponse<UsuarioRecuperadoDto>>(`${this.urlBase}/${id}`);
    }

    alterar(id: number, dto: UsuarioAlterarDto): Observable<StandardResponse<UsuarioAlteradoDto>> {
        return this.httpClient.put<StandardResponse<UsuarioAlteradoDto>>(`${this.urlBase}/${id}`, dto).pipe(tap(() => this.catalogo.invalidar()));
    }

    /** A própria pessoa escolhendo a cor da bolinha (`null` volta à cor padrão). */
    alterarCor(dto: UsuarioCorAlterarDto): Observable<StandardResponse<UsuarioCorAlteradaDto>> {
        return this.httpClient.put<StandardResponse<UsuarioCorAlteradaDto>>(`${this.urlBase}/cor`, dto).pipe(tap(() => this.catalogo.invalidar()));
    }

    excluir(id: number): Observable<StandardResponse<void>> {
        return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`).pipe(tap(() => this.catalogo.invalidar()));
    }

    /** Desfaz o soft delete ("Desfazer" do toast de exclusão). */
    restaurar(id: number): Observable<StandardResponse<UsuarioRestauradoDto>> {
        return this.httpClient.patch<StandardResponse<UsuarioRestauradoDto>>(`${this.urlBase}/${id}/restaurar`, {}).pipe(tap(() => this.catalogo.invalidar()));
    }

    alterarSenha(id: number, dto: UsuarioSenhaAlterarDto): Observable<StandardResponse<UsuarioSenhaAlteradaDto>> {
        return this.httpClient.patch<StandardResponse<UsuarioSenhaAlteradaDto>>(`${this.urlBase}/${id}/senha`, dto);
    }
}
