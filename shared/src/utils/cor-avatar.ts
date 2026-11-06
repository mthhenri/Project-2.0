/** Cor da bolinha (avatar) escolhida pela pessoa: `#RRGGBB` em maiúsculas; sem cor escolhida vale a de acento do tema. */
export const REGEX_COR_AVATAR = /^#[0-9A-F]{6}$/;

/** Texto escuro e claro das iniciais, escolhidos pelo contraste com o fundo. */
export const COR_TEXTO_CLARO_SOBRE_AVATAR = '#FFFFFF';
export const COR_TEXTO_ESCURO_SOBRE_AVATAR = '#111827';

/** Normaliza o que a pessoa digitou (`#abc123`, ` #ABC123 `) para `#ABC123`; o que não for cor completa de seis dígitos volta como veio. */
export function normalizarCorAvatar(valor: string): string {
    return valor.trim().toUpperCase();
}

export function ehCorAvatarValida(valor: unknown): valor is string {
    return typeof valor === 'string' && REGEX_COR_AVATAR.test(valor);
}

/** Luminância relativa (WCAG) de uma cor `#RRGGBB`, de 0 (preto) a 1 (branco). */
export function luminanciaDaCor(cor: string): number {
    const canais = [1, 3, 5].map((inicio) => {
        const valor = parseInt(cor.slice(inicio, inicio + 2), 16) / 255;
        return valor <= 0.03928 ? valor / 12.92 : Math.pow((valor + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

/** A cor das iniciais sobre o fundo `cor`: a de maior contraste entre o claro e o escuro. */
export function corDoTextoSobre(cor: string): string {
    const luminancia = luminanciaDaCor(cor);
    const contrasteComBranco = 1.05 / (luminancia + 0.05);
    const contrasteComEscuro = (luminancia + 0.05) / (luminanciaDaCor(COR_TEXTO_ESCURO_SOBRE_AVATAR) + 0.05);
    return contrasteComBranco >= contrasteComEscuro ? COR_TEXTO_CLARO_SOBRE_AVATAR : COR_TEXTO_ESCURO_SOBRE_AVATAR;
}
