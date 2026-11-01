import { TipoUsuarioEnum } from '@project20/shared';

/** Rótulo do tipo de usuário. `curto` abrevia "Desenvolvedor" para listas estreitas. */
export function rotuloTipoUsuario(tipo: TipoUsuarioEnum, curto = false): string {
    switch (tipo) {
        case TipoUsuarioEnum.ADMINISTRADOR:
            return 'Administrador';
        case TipoUsuarioEnum.GESTOR:
            return 'Gestor';
        case TipoUsuarioEnum.AUXILIAR:
            return curto ? 'Aux' : 'Auxiliar';
        default:
            return curto ? 'Dev' : 'Desenvolvedor';
    }
}

/** Cor da tag do tipo: o administrador se destaca do gestor. */
export function severidadeTipoUsuario(tipo: TipoUsuarioEnum): 'info' | 'success' | 'warn' | 'contrast' {
    switch (tipo) {
        case TipoUsuarioEnum.ADMINISTRADOR:
            return 'contrast';
        case TipoUsuarioEnum.GESTOR:
            return 'warn';
        case TipoUsuarioEnum.AUXILIAR:
            return 'success';
        default:
            return 'info';
    }
}
