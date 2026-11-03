import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
    DESCRICAO_TIPO_USUARIO,
    StandardResponse,
    TipoUsuarioAjudaAlteradaDto,
    TipoUsuarioAjudaAlterarDto,
    TipoUsuarioAjudaResumoDto,
    TipoUsuarioEnum,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprio } from '../../../core/interceptors/loading.interceptor';

/**
 * Os textos que explicam cada tipo de usuário (task 308). Ficam em cache num sinal: a tela de Usuários pede `carregar()` e os componentes leem
 * `textos()`; trocar um texto (só administrador) atualiza o cache e, com ele, o popover e o bloco do formulário já abertos. Enquanto a API não
 * respondeu, vale o texto padrão do `shared`.
 */
@Injectable({ providedIn: 'root' })
export class TipoUsuarioAjudaService {
    private readonly httpClient = inject(HttpClient);
    private readonly urlBase = `${ambiente.apiUrl}/tipo-usuario-ajuda`;
    private carregada = false;

    readonly textos = signal<Record<TipoUsuarioEnum, string>>({ ...DESCRICAO_TIPO_USUARIO });

    /** Busca os textos na primeira chamada; `forcar` busca de novo (depois de um erro). */
    carregar(forcar = false): void {
        if (this.carregada && !forcar) return;
        this.carregada = true;
        this.httpClient.get<StandardResponse<TipoUsuarioAjudaResumoDto[]>>(this.urlBase, comFeedbackProprio()).subscribe({
            next: (resposta) => {
                const gravados = resposta.dados ?? [];
                this.textos.update((atuais) => ({ ...atuais, ...Object.fromEntries(gravados.map((ajuda) => [ajuda.tipo, ajuda.texto])) }));
            },
            error: () => (this.carregada = false),
        });
    }

    alterar(tipo: TipoUsuarioEnum, dto: TipoUsuarioAjudaAlterarDto): Observable<StandardResponse<TipoUsuarioAjudaAlteradaDto>> {
        return this.httpClient.put<StandardResponse<TipoUsuarioAjudaAlteradaDto>>(`${this.urlBase}/${tipo}`, dto).pipe(
            tap((resposta) => {
                const alterada = resposta.dados;
                if (alterada) this.textos.update((atuais) => ({ ...atuais, [alterada.tipo]: alterada.texto }));
            }),
        );
    }
}
