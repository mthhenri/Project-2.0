/** Quanto tempo a lista de modelos de um provedor fica guardada (spec 309). Passar a uma hora é só ajustar este valor. */
export const TEMPO_DO_CACHE_DOS_MODELOS_MS = 30 * 60 * 1000;

/** Quanto a tela espera a listagem de um provedor antes de desistir e voltar ao campo de digitação à mão. */
export const TEMPO_LIMITE_DA_LISTAGEM_DE_MODELOS_MS = 10_000;

/**
 * Cache em memória com validade por chave: **só sucesso entra** (uma falha não é guardada, a próxima abertura tenta de novo) e chamadas
 * simultâneas à mesma chave compartilham a mesma requisição em andamento. Vale para uma só instância do backend, como o cache da configuração.
 */
export class CacheEmMemoria<T> {
    private readonly guardados = new Map<string, { valor: T; expiraEm: number }>();
    private readonly emAndamento = new Map<string, Promise<T>>();

    constructor(
        private readonly duracaoMs: number,
        private readonly relogio: () => number = Date.now,
    ) {}

    async obter(chave: string, buscar: () => Promise<T>): Promise<T> {
        const guardado = this.guardados.get(chave);
        if (guardado && guardado.expiraEm > this.relogio()) return guardado.valor;

        const andamento = this.emAndamento.get(chave);
        if (andamento) return andamento;

        const requisicao = buscar()
            .then((valor) => {
                this.guardados.set(chave, { valor, expiraEm: this.relogio() + this.duracaoMs });
                return valor;
            })
            .finally(() => this.emAndamento.delete(chave));
        this.emAndamento.set(chave, requisicao);
        return requisicao;
    }
}

/** A promessa que vence o tempo: passou de `limiteMs`, falha (a requisição original segue sozinha, sem ninguém esperando por ela). */
export function comTempoLimite<T>(promessa: Promise<T>, limiteMs: number): Promise<T> {
    let temporizador: NodeJS.Timeout;
    const estouro = new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(() => rejeitar(new Error(`A listagem passou de ${limiteMs} ms`)), limiteMs);
    });
    return Promise.race([promessa, estouro]).finally(() => clearTimeout(temporizador));
}
