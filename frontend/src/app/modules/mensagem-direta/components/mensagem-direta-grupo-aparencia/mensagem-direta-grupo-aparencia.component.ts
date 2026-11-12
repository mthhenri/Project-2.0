import { ChangeDetectionStrategy, Component, effect, input, model, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LIMITE_NOME_DO_GRUPO, normalizarCorAvatar } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { CORES_SUGERIDAS_DO_GRUPO, EMOJIS_SUGERIDOS_DO_GRUPO } from '../../utils/grupo.util';
import { MensagemDiretaEmojiSeletorComponent } from '../mensagem-direta-emoji-seletor/mensagem-direta-emoji-seletor.component';

/**
 * Os campos de aparência de um grupo (task 247), os mesmos ao criar e ao editar: o nome, a cor (uma das sugeridas, qualquer outra ou "automática", que é o
 * degradê das cores dos membros) e o emoji que substitui as iniciais. Tem prévia do avatar. Quem usa liga os três valores com `[(nome)]`, `[(cor)]` e `[(emoji)]`.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-aparencia',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TooltipModule, AvatarGrupoComponent, MensagemDiretaEmojiSeletorComponent],
    templateUrl: './mensagem-direta-grupo-aparencia.component.html',
    styleUrl: './mensagem-direta-grupo-aparencia.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoAparenciaComponent {
    readonly nome = model('');
    /** `#RRGGBB`; `null` = automática (degradê dos membros). */
    readonly cor = model<string | null>(null);
    readonly emoji = model<string | null>(null);
    /** As cores de bolinha dos membros, para a prévia do degradê. */
    readonly coresDosMembros = input<string[]>([]);

    protected readonly limiteDoNome = LIMITE_NOME_DO_GRUPO;
    protected readonly coresSugeridas = CORES_SUGERIDAS_DO_GRUPO;
    protected readonly emojisSugeridos = EMOJIS_SUGERIDOS_DO_GRUPO;
    protected readonly controleNome = new FormControl('', { nonNullable: true });
    protected readonly controleCor = new FormControl('#3366FF', { nonNullable: true });
    protected readonly seletorDeEmojiAberto = signal(false);

    constructor() {
        this.controleNome.valueChanges.subscribe((texto) => {
            if (texto !== this.nome()) this.nome.set(texto);
        });
        this.controleCor.valueChanges.subscribe((cor) => this.cor.set(normalizarCorAvatar(cor)));
        // O valor de fora (abrir outro grupo, restaurar) volta para os campos sem disparar o caminho de ida.
        effect(() => {
            const nome = this.nome();
            if (nome !== this.controleNome.value) this.controleNome.setValue(nome, { emitEvent: false });
        });
        effect(() => {
            const cor = this.cor();
            if (cor && cor !== normalizarCorAvatar(this.controleCor.value)) this.controleCor.setValue(cor, { emitEvent: false });
        });
    }

    protected escolherCor(cor: string | null): void {
        this.cor.set(cor);
    }

    protected escolherEmoji(emoji: string | null): void {
        this.emoji.set(emoji);
        this.seletorDeEmojiAberto.set(false);
    }

    protected alternarSeletor(): void {
        this.seletorDeEmojiAberto.update((aberto) => !aberto);
    }
}
