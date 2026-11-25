import { dataIsoNoFuso, diaMesNoFuso, horaNoFuso } from '@project20/shared';

// Regras puras dos detalhes da Piá (task 492).

const TEXTO_DO_CANTO = 'bemtevi';
const DIA_DO_ANIVERSARIO = '29/03';
const INICIO_DO_CEDO = '05:00';
const FIM_DO_CEDO = '08:00';

export const CHAVE_DO_ANIVERSARIO = 'pia.detalhe.aniversario';
export const CHAVE_DO_CEDO = 'pia.detalhe.cedo';

/** A mensagem é só o nome do canto, sem contar maiúsculas, acentos, pontuação, espaços e hífens. */
export function ehMensagemDoCanto(texto: string): boolean {
    return texto.normalize('NFD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === TEXTO_DO_CANTO;
}

export function ehDiaDoAniversario(instante: Date, fusoHorario: string): boolean {
    return diaMesNoFuso(instante, fusoHorario) === DIA_DO_ANIVERSARIO;
}

/** Das 05:00 às 08:00, inclusive, no fuso do sistema. */
export function ehCedo(instante: Date, fusoHorario: string): boolean {
    const hora = horaNoFuso(instante, fusoHorario);
    return hora >= INICIO_DO_CEDO && hora <= FIM_DO_CEDO;
}

/** Reserva a vez de hoje: `false` se já foi usada ou se o armazenamento não está disponível (para não repetir a cada abertura). */
export function reservarVezDoDia(chave: string, instante: Date, fusoHorario: string): boolean {
    try {
        const hoje = dataIsoNoFuso(instante, fusoHorario);
        if (localStorage.getItem(chave) === hoje) return false;
        localStorage.setItem(chave, hoje);
        return true;
    } catch {
        return false;
    }
}
