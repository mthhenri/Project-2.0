import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MembroNoGrupo, nomeDoAutorNoGrupo } from '../../utils/grupo.util';
import { MensagemNaConversa, formatarHora, previaDaMensagem, trechosComRealce } from '../../utils/mensagem-direta.util';

const ATRASO_DA_BUSCA_MS = 300;

type SituacaoDaBusca = 'PARADA' | 'CARREGANDO' | 'ERRO' | 'PRONTA';

/**
 * A busca dentro de um grupo ou canal (task 250), aberta pela lupa do cabeçalho da conversa: o campo de texto (sem acento) e o filtro "Com código", com os
 * resultados realçados, como a busca geral do popup. Só traz mensagens deste grupo. Clicar num resultado fecha a busca e leva a conversa até a mensagem.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-busca',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule],
    templateUrl: './mensagem-direta-grupo-busca.component.html',
    styleUrl: './mensagem-direta-grupo-busca.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoBuscaComponent {
    private readonly estado = inject(MensagemDiretaEstadoService);
    private readonly meuId = inject(UsuarioSessaoService).id;
    private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

    readonly grupoId = input.required<number>();
    readonly membros = input<MembroNoGrupo[]>([]);

    readonly ir = output<string>();
    readonly fechar = output<void>();

    protected readonly texto = new FormControl('', { nonNullable: true });
    protected readonly somenteCodigo = signal(false);
    protected readonly situacao = signal<SituacaoDaBusca>('PARADA');
    protected readonly resultados = signal<MensagemNaConversa[]>([]);
    protected readonly termo = signal('');
    protected readonly rotuloDoTotal = computed(() => {
        const total = this.resultados().length;
        return total === 0 ? `nenhuma com “${this.termo()}”` : `${total} ${total === 1 ? 'resultado' : 'resultados'}`;
    });
    /** Só a resposta da busca mais recente vale. */
    private geracao = 0;

    constructor() {
        afterNextRender(() => this.campo()?.nativeElement.focus());
        this.texto.valueChanges.pipe(debounceTime(ATRASO_DA_BUSCA_MS), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => void this.buscar());
    }

    protected alternarCodigo(): void {
        this.somenteCodigo.update((ligado) => !ligado);
        void this.buscar();
    }

    protected async buscar(): Promise<void> {
        const termo = this.texto.value.trim();
        const geracao = ++this.geracao;
        this.termo.set(termo);
        if (!termo) {
            this.resultados.set([]);
            this.situacao.set('PARADA');
            return;
        }
        this.situacao.set('CARREGANDO');
        try {
            const achadas = await this.estado.grupoEstado.buscarNoGrupo(this.grupoId(), termo, this.somenteCodigo());
            if (geracao !== this.geracao) return;
            this.resultados.set(achadas);
            this.situacao.set('PRONTA');
        } catch {
            if (geracao === this.geracao) this.situacao.set('ERRO');
        }
    }

    protected limpar(): void {
        this.texto.setValue('');
        void this.buscar();
        this.campo()?.nativeElement.focus();
    }

    protected autor(mensagem: MensagemNaConversa): string {
        return nomeDoAutorNoGrupo(this.membros(), mensagem.autorUsuarioId, this.meuId());
    }

    protected hora(mensagem: MensagemNaConversa): string {
        return `${mensagem.createdDate.toLocaleDateString('pt-BR')} ${formatarHora(mensagem.createdDate)}`;
    }

    protected trechos(mensagem: MensagemNaConversa) {
        return trechosComRealce(previaDaMensagem(mensagem.texto, false, false) || mensagem.texto, this.termo());
    }
}
