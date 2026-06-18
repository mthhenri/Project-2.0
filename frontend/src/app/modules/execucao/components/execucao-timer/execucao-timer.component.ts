import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { segundosDecorridos, formatarRelogio } from '../../models/execucao.model';

@Component({
  selector: 'app-execucao-timer',
  standalone: true,
  imports: [],
  templateUrl: './execucao-timer.component.html',
})
export class ExecucaoTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) inicioData!: Date;

  readonly tempoDecorrido = signal<string>('00:00:00');
  private intervalo?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.atualizarTempo();
    this.intervalo = setInterval(() => this.atualizarTempo(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalo);
  }

  private atualizarTempo(): void {
    this.tempoDecorrido.set(formatarRelogio(segundosDecorridos(this.inicioData)));
  }
}
