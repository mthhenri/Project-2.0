import { Component, input } from '@angular/core';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';

/**
 * Selo "Em execução" de uma atividade (ponto pulsante e, quando se conhece o início, o cronômetro). A listagem usa na linha e o detalhe
 * da atividade pode usar no cabeçalho. O cronômetro só existe para a execução do usuário logado: das dos outros não se tem o início.
 */
@Component({
    selector: 'app-atividade-em-execucao',
    standalone: true,
    imports: [ExecucaoTimerComponent],
    templateUrl: './atividade-em-execucao.component.html',
    styleUrl: './atividade-em-execucao.component.scss',
})
export class AtividadeEmExecucaoComponent {
    /** O instante em que a execução do usuário logado começou; sem ele, só o selo. */
    readonly inicio = input<Date | null>(null);
}
