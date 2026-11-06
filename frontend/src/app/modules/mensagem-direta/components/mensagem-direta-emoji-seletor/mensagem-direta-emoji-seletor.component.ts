import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CATEGORIAS_DE_EMOJI, buscarEmojis, normalizarParaBusca } from '../../utils/emoji.util';

/**
 * O seletor de emoji (task 314): todos os emojis por categoria, com busca pelo nome em português. Um só componente para os dois usos: o botão do
 * compositor (insere no cursor) e o "+" da faixa de reações (grava a reação). Quem o usa decide onde ele aparece e o que fazer com o emoji escolhido.
 */
@Component({
    selector: 'app-mensagem-direta-emoji-seletor',
    standalone: true,
    imports: [ReactiveFormsModule, InputTextModule, TooltipModule],
    templateUrl: './mensagem-direta-emoji-seletor.component.html',
    styleUrl: './mensagem-direta-emoji-seletor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaEmojiSeletorComponent {
    readonly escolher = output<string>();
    readonly fechar = output<void>();

    protected readonly categorias = CATEGORIAS_DE_EMOJI;
    protected readonly controleBusca = new FormControl('', { nonNullable: true });
    private readonly termo = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
    protected readonly categoriaAtiva = signal(CATEGORIAS_DE_EMOJI[0].codigo);
    private readonly campoDeBusca = viewChild<ElementRef<HTMLInputElement>>('campoDeBusca');

    protected readonly emBusca = computed(() => normalizarParaBusca(this.termo()) !== '');
    protected readonly visiveis = computed(() => {
        if (this.emBusca()) return buscarEmojis(this.termo());
        return this.categorias.find((categoria) => categoria.codigo === this.categoriaAtiva())?.emojis ?? [];
    });
    protected readonly rotuloDaCategoria = computed(() => (this.emBusca() ? 'Resultados da busca' : this.categorias.find((categoria) => categoria.codigo === this.categoriaAtiva())?.rotulo ?? ''));

    constructor() {
        afterNextRender(() => this.campoDeBusca()?.nativeElement.focus());
    }

    protected escolherCategoria(codigo: string): void {
        this.categoriaAtiva.set(codigo);
    }

    /** Esc fecha só o seletor: não deixa o popup do chat ouvir e se ocultar. */
    protected aoApertarEsc(evento: Event): void {
        evento.stopPropagation();
        this.fechar.emit();
    }
}
