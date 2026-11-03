import { Injectable, computed, signal } from '@angular/core';
import {
    TipoUsuarioEnum,
    UsuarioRecuperadoDto,
    podeAtribuirMembroOuTag,
    podeConduzirExecucaoDeOutro,
    podeEditarAtividadeDeOutro,
    podeEditarDemanda,
    podeEditarExecucaoDeOutro,
    podeGerenciarTag,
    podeSerMembroDeDemanda,
    podeVerExecucaoEPontoDeOutro,
    temPermissaoDeAdministrador,
    temPermissaoDeGestor,
    temVisibilidadeTotal,
} from '@project20/shared';

@Injectable({ providedIn: 'root' })
export class UsuarioSessaoService {
    private readonly CHAVE_SESSAO = 'usuario_sessao';

    private readonly _usuario = signal<UsuarioRecuperadoDto | null>(null);

    readonly usuarioAtual  = this._usuario.asReadonly();
    readonly id            = computed(() => this._usuario()?.id);
    readonly login         = computed(() => this._usuario()?.login);
    readonly nomeCompleto  = computed(() => this._usuario()?.nomeCompleto);
    readonly eGestor       = computed(() => {
        const usuario = this._usuario();
        return !!usuario && temPermissaoDeGestor(usuario.tipo);
    });

    readonly eAdministrador = computed(() => {
        const usuario = this._usuario();
        return !!usuario && temPermissaoDeAdministrador(usuario.tipo);
    });

    /** O auxiliar: desenvolvedor com permissões a mais. Para decidir uma ação, prefira as permissões por ação abaixo. */
    readonly eAuxiliar = computed(() => this._usuario()?.tipo === TipoUsuarioEnum.AUXILIAR);

    // Uma permissão por ação, a mesma função do `shared` que o backend usa (auxiliar, gestor e administrador passam).
    private permissaoPorAcao(permissao: (tipo: TipoUsuarioEnum) => boolean) {
        return computed(() => {
            const usuario = this._usuario();
            return !!usuario && permissao(usuario.tipo);
        });
    }

    readonly temVisaoTotal             = this.permissaoPorAcao(temVisibilidadeTotal);
    readonly podeEditarDemanda         = this.permissaoPorAcao(podeEditarDemanda);
    readonly podeAtribuirMembroOuTag   = this.permissaoPorAcao(podeAtribuirMembroOuTag);
    readonly podeEditarAtividadeDeOutro = this.permissaoPorAcao(podeEditarAtividadeDeOutro);
    readonly podeConduzirExecucaoDeOutro = this.permissaoPorAcao(podeConduzirExecucaoDeOutro);
    readonly podeVerExecucaoEPontoDeOutro = this.permissaoPorAcao(podeVerExecucaoEPontoDeOutro);
    readonly podeEditarExecucaoDeOutro = this.permissaoPorAcao(podeEditarExecucaoDeOutro);
    readonly podeGerenciarTag          = this.permissaoPorAcao(podeGerenciarTag);
    readonly podeSerMembroDeDemanda    = this.permissaoPorAcao(podeSerMembroDeDemanda);

    constructor() {
        this.restaurarSessao();
    }

    private restaurarSessao(): void {
        const dadosSalvos = localStorage.getItem(this.CHAVE_SESSAO);
        if (!dadosSalvos) return;
        try {
            this._usuario.set(JSON.parse(dadosSalvos));
        } catch {
            localStorage.removeItem(this.CHAVE_SESSAO);
        }
    }

    definirUsuario(usuario: UsuarioRecuperadoDto): void {
        this._usuario.set(usuario);
        localStorage.setItem(this.CHAVE_SESSAO, JSON.stringify(usuario));
    }

    limpar(): void {
        this._usuario.set(null);
        localStorage.removeItem(this.CHAVE_SESSAO);
    }
}
