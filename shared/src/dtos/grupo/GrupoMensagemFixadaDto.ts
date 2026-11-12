import { GrupoMensagemFixadaResumoDto } from './GrupoMensagemFixadaResumoDto';

/** A mensagem fixada; `jaEstavaFixada` quando o pedido só repetiu uma fixação que já existia. */
export interface GrupoMensagemFixadaDto {
    fixada: GrupoMensagemFixadaResumoDto;
    jaEstavaFixada: boolean;
}
