import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaConversaComponent } from '../mensagem-direta-conversa/mensagem-direta-conversa.component';
import { MensagemDiretaListaComponent } from '../mensagem-direta-lista/mensagem-direta-lista.component';
import { MensagemDiretaNovaComponent } from '../mensagem-direta-nova/mensagem-direta-nova.component';

/**
 * O popup do chat entre colaboradores (task 210): um painel fixo no canto inferior direito, 392×640, aberto pelo botão do topbar. Vive no layout,
 * então o stream de eventos fica aberto (e as não lidas contadas) enquanto o usuário está no Project, com o popup aberto ou não.
 */
@Component({
  selector: 'app-mensagem-direta-popup',
  standalone: true,
  imports: [MensagemDiretaListaComponent, MensagemDiretaConversaComponent, MensagemDiretaNovaComponent],
  templateUrl: './mensagem-direta-popup.component.html',
  styleUrl: './mensagem-direta-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaPopupComponent implements OnInit, OnDestroy {
  protected readonly estado = inject(MensagemDiretaEstadoService);

  ngOnInit(): void {
    this.estado.iniciar();
  }

  ngOnDestroy(): void {
    this.estado.parar();
  }
}
