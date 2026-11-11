/**
 * O alvo de uma proposta é acessível para a pessoa quando todas as leituras dele, feitas pelas services com o usuário dela, dão certo (task 315). As
 * services lançam "não encontrado" ou "sem acesso" quando a pessoa não vê o alvo; qualquer falha esconde a proposta, nunca a mostra.
 */
export async function alvoAcessivel(...leituras: Array<() => Promise<unknown>>): Promise<boolean> {
    try {
        for (const ler of leituras) await ler();
        return true;
    } catch {
        return false;
    }
}

/** O id inteiro e positivo que a proposta guarda num campo, ou `null` (campo ausente ou inválido: a proposta fica oculta). */
export function idDoAlvo(dados: Record<string, unknown>, campo: string): number | null {
    const valor = Number(dados[campo]);
    return Number.isInteger(valor) && valor >= 1 ? valor : null;
}
