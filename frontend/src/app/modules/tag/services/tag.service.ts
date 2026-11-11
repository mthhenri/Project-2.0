import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
    TagCriarDto,
    TagCriadaDto,
    TagResumoDto,
    TagRecuperadaDto,
    TagAlterarDto,
    TagAlteradaDto,
    StandardResponse,
    TagRestauradaDto,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comErroTratadoPelaTela } from '../../../core/interceptors/error-handler.interceptor';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { CatalogoEmMemoria } from '../../../core/utils/catalogo-em-memoria';

@Injectable({ providedIn: 'root' })
export class TagService {
    private readonly httpClient = inject(HttpClient);
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly urlBase = `${ambiente.apiUrl}/tag`;

    /** Cópia em memória das tags para os seletores das demandas e atividades (P-080); as gravações abaixo a invalidam. */
    private readonly catalogo = new CatalogoEmMemoria<TagResumoDto[]>({ buscar: () => this.listar(), dono: () => this.sessao.id() ?? null });

    /** Sempre do servidor: é a lista da tela de manutenção das tags. */
    listar(): Observable<StandardResponse<TagResumoDto[]>> {
        return this.httpClient.get<StandardResponse<TagResumoDto[]>>(this.urlBase, comFeedbackProprio());
    }

    /** As tags para um seletor: da memória enquanto valem (60 s) e até a próxima gravação de tag feita aqui. */
    listarCatalogo(): Observable<StandardResponse<TagResumoDto[]>> {
        return this.catalogo.obter();
    }

    /** `erroNaTela`: a tela mostra a falha por conta própria (hint do quick-add), sem o toast genérico. */
    criar(dto: TagCriarDto, erroNaTela = false): Observable<StandardResponse<TagCriadaDto>> {
        return this.httpClient.post<StandardResponse<TagCriadaDto>>(this.urlBase, dto, erroNaTela ? comErroTratadoPelaTela() : {}).pipe(tap(() => this.catalogo.invalidar()));
    }

    recuperar(id: number): Observable<StandardResponse<TagRecuperadaDto>> {
        return this.httpClient.get<StandardResponse<TagRecuperadaDto>>(`${this.urlBase}/${id}`);
    }

    alterar(id: number, dto: TagAlterarDto, erroNaTela = false): Observable<StandardResponse<TagAlteradaDto>> {
        return this.httpClient.put<StandardResponse<TagAlteradaDto>>(`${this.urlBase}/${id}`, dto, erroNaTela ? comErroTratadoPelaTela() : {}).pipe(tap(() => this.catalogo.invalidar()));
    }

    excluir(id: number): Observable<StandardResponse<void>> {
        return this.httpClient.delete<StandardResponse<void>>(`${this.urlBase}/${id}`).pipe(tap(() => this.catalogo.invalidar()));
    }

    /** Desfaz o soft delete ("Desfazer" do toast de exclusão). */
    restaurar(id: number): Observable<StandardResponse<TagRestauradaDto>> {
        return this.httpClient.patch<StandardResponse<TagRestauradaDto>>(`${this.urlBase}/${id}/restaurar`, {}).pipe(tap(() => this.catalogo.invalidar()));
    }
}
