import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ExecucaoAtivaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comLeituraDeFundo } from '../interceptors/loading.interceptor';

/**
 * Execução ativa do usuário logado, compartilhada por todas as telas (chip da topbar — task 95).
 * Carrega no boot, re-sincroniza ao voltar para a aba (o backend encerra execuções às 23:59:59)
 * e é atualizada pelo `execucaoAtivaInterceptor` após iniciar/encerrar em qualquer tela.
 */
/** Quem pede sem `forcar` (foco da janela, volta à aba) não repete uma consulta cuja resposta chegou há menos que isto. */
const JANELA_DE_FRESCOR_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class ExecucaoAtivaService {
    private readonly http = inject(HttpClient);

    private readonly _ativa = signal<ExecucaoAtivaDto | null>(null);
    private readonly _carregando = signal<boolean>(false);
    private readonly _jaCarregou = signal<boolean>(false);
    private readonly _pausasDoChip = signal<number>(0);
    private consultaEmCurso = false;
    private repetirAoFim = false;
    private ultimaRespostaEm = 0;

    readonly ativa = this._ativa.asReadonly();
    /** Só a primeira carga mostra esqueleto; as demais ressincronizações são silenciosas. */
    readonly primeiraCarga = computed(() => this._carregando() && !this._jaCarregou());
    /** Contador incrementado quando a pausa parte do chip: telas de lista se recarregam. */
    /** A primeira resposta já chegou: antes disso "sem execução ativa" ainda não é uma informação. */
    readonly jaCarregou = this._jaCarregou.asReadonly();
    readonly pausasDoChip = this._pausasDoChip.asReadonly();

    /**
     * Relê a execução ativa sem repetir o que já está a caminho ou acabou de chegar. `forcar` pula a janela de frescor, para quem
     * acabou de mudar a execução (iniciar, encerrar, proposta da IA); se há uma consulta em curso, ela não é duplicada, mas uma
     * releitura é agendada para o fim dela, porque a resposta em voo pode ser anterior à mudança.
     */
    carregar(opcoes: { forcar?: boolean } = {}): void {
        if (this.consultaEmCurso) {
            if (opcoes.forcar) this.repetirAoFim = true;
            return;
        }
        if (!opcoes.forcar && Date.now() - this.ultimaRespostaEm < JANELA_DE_FRESCOR_MS) return;

        this.consultaEmCurso = true;
        this._carregando.set(true);
        this.http
            .get<StandardResponse<ExecucaoAtivaDto | null>>(`${ambiente.apiUrl}/execucao/ativa`, comLeituraDeFundo())
            .subscribe({
                next: (resposta) => this._ativa.set(resposta.sucesso ? resposta.dados ?? null : null),
                error: () => this.encerrarConsulta(false),
                complete: () => {
                    this._jaCarregou.set(true);
                    this.encerrarConsulta(true);
                },
            });
    }

    /** Só a resposta que chegou conta como "fresca": depois de uma falha a próxima tentativa não espera a janela. */
    private encerrarConsulta(chegou: boolean): void {
        this.consultaEmCurso = false;
        if (chegou) this.ultimaRespostaEm = Date.now();
        this._carregando.set(false);
        if (this.repetirAoFim) {
            this.repetirAoFim = false;
            this.carregar({ forcar: true });
        }
    }

    /** Atualização otimista (pausa pelo chip) com possibilidade de rollback. */
    definir(execucao: ExecucaoAtivaDto | null): void {
        this._ativa.set(execucao);
    }

    registrarPausaDoChip(): void {
        this._pausasDoChip.update((valor) => valor + 1);
    }

    limpar(): void {
        this._ativa.set(null);
        this._jaCarregou.set(false);
        this.ultimaRespostaEm = 0;
    }
}
