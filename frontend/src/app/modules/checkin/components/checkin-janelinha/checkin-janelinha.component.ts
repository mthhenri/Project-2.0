import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CheckinSituacaoConsultadaDto } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { CheckinPage } from '../../pages/checkin/checkin.page';
import { CheckinService } from '../../services/checkin.service';
import { deveMostrarJanelinha, esperaAteOCheckin } from '../../utils/checkin.util';

/** De quanto em quanto tempo o Project confere se o horário do check-in chegou (o horário em si é sorteado no backend). */
const INTERVALO_DA_CONFERENCIA_MS = 20_000;
/** O maior atraso que um `setTimeout` aceita; horários mais distantes são alcançados pela conferência periódica. */
const MAIOR_ESPERA_MS = 2_000_000_000;

/**
 * A janelinha do check-in dentro do Project (task 161), para o navegador e o Project Desktop: quando o backend diz que o horário chegou,
 * mostra a tela do check-in num diálogo central com o fundo escurecido, por cima de qualquer rota do layout. Não tem fechar: some
 * quando a descrição é registrada ou os check-ins são suspensos ("Estou em reunião"). Com a IA fora do ar ela não trava a tela.
 */
@Component({
  selector: 'app-checkin-janelinha',
  standalone: true,
  imports: [CheckinPage],
  templateUrl: './checkin-janelinha.component.html',
  styleUrl: './checkin-janelinha.component.scss',
})
export class CheckinJanelinhaComponent implements OnInit {
  private readonly checkinService = inject(CheckinService);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly situacao = signal<CheckinSituacaoConsultadaDto | null>(null);
  private temporizadorNoHorario: ReturnType<typeof setTimeout> | null = null;

  readonly visivel = computed(() => deveMostrarJanelinha(this.situacao(), this.iaDisponibilidade.estado()));

  constructor() {
    const intervalo = setInterval(() => this.conferir(), INTERVALO_DA_CONFERENCIA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') this.conferir();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    this.destroyRef.onDestroy(() => {
      clearInterval(intervalo);
      if (this.temporizadorNoHorario !== null) clearTimeout(this.temporizadorNoHorario);
      document.removeEventListener('visibilitychange', aoVoltar);
    });
  }

  ngOnInit(): void {
    this.iaDisponibilidade.carregar();
    this.conferir();
  }

  /** O diálogo avisou que acabou (registrado, suspenso ou sem execução): confere de novo para o próximo horário. */
  aoEncerrar(): void {
    this.situacao.update((atual) => (atual ? { ...atual, disparado: false } : atual));
    this.conferir();
  }

  private conferir(): void {
    // Com o diálogo aberto, quem confere é a própria tela do check-in.
    if (this.visivel()) return;
    this.checkinService.consultarSituacao().subscribe({
      next: (resposta) => {
        this.situacao.set(resposta.dados ?? null);
        this.agendarNoHorario();
      },
      error: () => undefined,
    });
  }

  /** Confere de novo no instante sorteado, para a janelinha aparecer na hora e não só na próxima conferência periódica. */
  private agendarNoHorario(): void {
    if (this.temporizadorNoHorario !== null) clearTimeout(this.temporizadorNoHorario);
    this.temporizadorNoHorario = null;
    const espera = esperaAteOCheckin(this.situacao(), Date.now());
    if (espera === null) return;
    this.temporizadorNoHorario = setTimeout(() => this.conferir(), Math.min(espera + 500, MAIOR_ESPERA_MS));
  }
}
