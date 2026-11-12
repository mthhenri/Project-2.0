import { GrupoMensagemFixadaResumoDto } from './GrupoMensagemFixadaResumoDto';

/** As mensagens fixadas, da fixada há menos tempo para a mais antiga. */
export interface GrupoMensagemFixadaListadasDto {
    grupoId: number;
    fixadas: GrupoMensagemFixadaResumoDto[];
}
