import { ChangeDetectionStrategy, Component, NgZone, computed, effect, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { estaSilenciado } from '@project20/shared';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';

/** O maior atraso que o `setTimeout` aceita; um silêncio mais longo ("até reativar") nunca vence na prática. */
const LIMITE_DO_TEMPORIZADOR_MS = 2_147_483_647;

/**
 * A engrenagem das configurações do chat (cabeçalho da lista e barra de conversas): abre a tela de configurações dentro do popup. Fica em alerta
 * (laranja) quando o chat está silenciado ou com os avisos desligados.
 */
@Component({
    selector: 'app-mensagem-direta-configuracoes-botao',
    standalone: true,
    imports: [ButtonModule, TooltipModule],
    templateUrl: './mensagem-direta-configuracoes-botao.component.html',
    styleUrl: './mensagem-direta-configuracoes-botao.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaConfiguracoesBotaoComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    private readonly avisos = inject(MensagemDiretaAvisosService);
    private readonly zona = inject(NgZone);

    /** De que lado a dica aparece. */
    readonly lado = input<'top' | 'bottom' | 'left' | 'right'>('bottom');

    private readonly agora = signal(new Date());
    protected readonly emAlerta = computed(() => estaSilenciado(this.avisos.preferencia().silenciadoAteDate, this.agora()) || !this.avisos.preferencia().avisosAtivos);

    constructor() {
        // Quando o silêncio vence com a tela aberta, a engrenagem sai do alerta sozinha.
        effect((aoLimpar) => {
            const ate = this.avisos.preferencia().silenciadoAteDate;
            const falta = ate ? ate.getTime() - Date.now() : 0;
            if (falta <= 0 || falta > LIMITE_DO_TEMPORIZADOR_MS) return;
            const manipulador = this.zona.runOutsideAngular(() => setTimeout(() => this.agora.set(new Date()), falta + 50));
            aoLimpar(() => clearTimeout(manipulador));
        });
    }
}
