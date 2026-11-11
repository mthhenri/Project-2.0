import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
import { StandardResponse } from '@project20/shared';

/** Quanto tempo uma lista de apoio (tags, usuários) vale antes de ser pedida de novo (P-080). */
export const VALIDADE_DO_CATALOGO_MS = 60_000;

interface OpcoesDoCatalogo<Dados> {
    /** A consulta de verdade, pedida só quando não há cópia válida nem consulta em curso. */
    buscar: () => Observable<StandardResponse<Dados>>;
    /** Quem está logado: a cópia de uma pessoa nunca é entregue a outra (a lista de usuários, por exemplo, é só do gestor). */
    dono: () => number | null;
    validadeMs?: number;
    agora?: () => number;
}

/**
 * Cópia em memória de uma lista de apoio que várias telas pedem logo ao abrir (seletores de tag e de membro).
 *
 * - vale por `VALIDADE_DO_CATALOGO_MS`; passado o prazo, a próxima leitura vai ao servidor;
 * - quem lê junto compartilha a mesma consulta em curso;
 * - só resposta de sucesso é guardada: erro e 403 nunca ficam "grudados";
 * - `invalidar()` descarta a cópia e a consulta em curso, para a próxima leitura ver a gravação que acabou de acontecer
 *   (mudança feita por outra pessoa só chega ao fim do prazo);
 * - a cópia é da pessoa logada: outra sessão começa do zero.
 *
 * Telas de manutenção (Tags, Usuários) não passam por aqui: lêem sempre direto do servidor.
 */
export class CatalogoEmMemoria<Dados> {
    private readonly validadeMs: number;
    private readonly agora: () => number;
    private geracao = 0;
    private guardado: { dono: number | null; validoAte: number; resposta: StandardResponse<Dados> } | null = null;
    private emCurso: { dono: number | null; consulta: Observable<StandardResponse<Dados>> } | null = null;

    constructor(private readonly opcoes: OpcoesDoCatalogo<Dados>) {
        this.validadeMs = opcoes.validadeMs ?? VALIDADE_DO_CATALOGO_MS;
        this.agora = opcoes.agora ?? Date.now;
    }

    obter(): Observable<StandardResponse<Dados>> {
        const dono = this.opcoes.dono();

        if (this.guardado && this.guardado.dono === dono && this.agora() < this.guardado.validoAte) {
            return of(this.guardado.resposta);
        }
        if (this.emCurso && this.emCurso.dono === dono) return this.emCurso.consulta;

        const geracaoDaConsulta = this.geracao;
        const consulta: Observable<StandardResponse<Dados>> = this.opcoes.buscar().pipe(
            tap((resposta) => {
                // Uma gravação feita enquanto a consulta voava torna a resposta velha: não vira cópia.
                if (resposta.sucesso && geracaoDaConsulta === this.geracao) {
                    this.guardado = { dono, validoAte: this.agora() + this.validadeMs, resposta };
                }
            }),
            finalize(() => {
                if (this.emCurso?.consulta === consulta) this.emCurso = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false }),
        );
        this.emCurso = { dono, consulta };
        return consulta;
    }

    /** Chame depois de gravar (criar, alterar, excluir, restaurar) algo que a lista mostra. */
    invalidar(): void {
        this.geracao++;
        this.guardado = null;
        this.emCurso = null;
    }
}
