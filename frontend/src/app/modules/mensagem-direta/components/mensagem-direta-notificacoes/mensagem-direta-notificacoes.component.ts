import { ChangeDetectionStrategy, Component, computed, effect, inject, NgZone, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { estaSilenciado } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { OpcaoDeSilencio, rotuloDoSilencio } from '../../utils/avisos.util';

interface OpcaoDoMenu {
  opcao: OpcaoDeSilencio;
  rotulo: string;
}

/** O maior atraso que o `setTimeout` aceita; um silêncio mais longo ("até reativar") nunca vence na prática. */
const LIMITE_DO_TEMPORIZADOR_MS = 2_147_483_647;

/**
 * O sino do cabeçalho da lista e o menu "Notificações" (task 212): os interruptores de avisos, aviso no Project Desktop e som, e o silêncio geral
 * (1 hora, até amanhã às 8h, até reativar). O interruptor do Desktop só guarda a escolha (quem a usa é o app, na 213). Cada mudança é gravada
 * na hora; se o servidor recusar, a tela volta ao valor anterior e o menu avisa.
 */
@Component({
  selector: 'app-mensagem-direta-notificacoes',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, PopoverModule, ToggleSwitchModule, TooltipModule],
  templateUrl: './mensagem-direta-notificacoes.component.html',
  styleUrl: './mensagem-direta-notificacoes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaNotificacoesComponent {
  private readonly servico = inject(MensagemDiretaAvisosService);
  private readonly zona = inject(NgZone);

  protected readonly preferencia = this.servico.preferencia;
  protected readonly erro = this.servico.erroNaPreferencia;

  readonly controleAvisos = new FormControl(true, { nonNullable: true });
  readonly controleDesktop = new FormControl(true, { nonNullable: true });
  readonly controleSom = new FormControl(false, { nonNullable: true });

  /** O relógio do menu: recalculado quando o menu abre e a cada mudança, para o "Silenciado até" não ficar velho. */
  private readonly agora = signal(new Date());
  protected readonly opcoes: OpcaoDoMenu[] = [
    { opcao: 'UMA_HORA', rotulo: 'Por 1 hora (reunião)' },
    { opcao: 'AMANHA_8H', rotulo: 'Até amanhã às 8h' },
    { opcao: 'ATE_REATIVAR', rotulo: 'Até eu reativar' },
  ];

  protected readonly silenciado = computed(() => estaSilenciado(this.preferencia().silenciadoAteDate, this.agora()));
  protected readonly rotuloDoSilencio = computed(() => rotuloDoSilencio(this.preferencia().silenciadoAteDate, this.agora(), ambiente.fusoHorario));

  constructor() {
    // A tela segue a preferência (carga, gravação e volta atrás); os interruptores gravam o que o usuário muda.
    effect(() => {
      const preferencia = this.preferencia();
      this.controleAvisos.setValue(preferencia.avisosAtivos, { emitEvent: false });
      this.controleDesktop.setValue(preferencia.avisoDesktopAtivo, { emitEvent: false });
      this.controleSom.setValue(preferencia.somAtivo, { emitEvent: false });
    });
    // Quando o silêncio vence com a tela aberta, o sino e o menu saem do estado "silenciado" sozinhos.
    effect((aoLimpar) => {
      const ate = this.preferencia().silenciadoAteDate;
      const falta = ate ? ate.getTime() - Date.now() : 0;
      if (falta <= 0 || falta > LIMITE_DO_TEMPORIZADOR_MS) return;
      // Fora da zona: um prazo de horas não pode segurar a estabilidade da aplicação.
      const manipulador = this.zona.runOutsideAngular(() => setTimeout(() => this.agora.set(new Date()), falta + 50));
      aoLimpar(() => clearTimeout(manipulador));
    });
    this.controleAvisos.valueChanges.subscribe((valor) => void this.servico.alterarPreferencia({ avisosAtivos: valor }));
    this.controleDesktop.valueChanges.subscribe((valor) => void this.servico.alterarPreferencia({ avisoDesktopAtivo: valor }));
    this.controleSom.valueChanges.subscribe((valor) => void this.servico.alterarPreferencia({ somAtivo: valor }));
  }

  protected atualizarRelogio(): void {
    this.agora.set(new Date());
  }

  protected async silenciar(opcao: OpcaoDeSilencio): Promise<void> {
    await this.servico.silenciarTudo(opcao);
    this.atualizarRelogio();
  }

  protected async reativar(): Promise<void> {
    await this.servico.reativarTudo();
    this.atualizarRelogio();
  }
}
