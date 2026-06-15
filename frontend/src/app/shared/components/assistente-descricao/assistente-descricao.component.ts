import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AssistenteDescricaoAuxiliadaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';

@Component({
  selector: 'app-assistente-descricao',
  standalone: true,
  imports: [ButtonModule, PanelModule, ProgressSpinnerModule],
  templateUrl: './assistente-descricao.component.html',
})
export class AssistenteDescricaoComponent {
  @Input() textoAtual: string = '';
  @Input() tipoEntidade: 'execucao' | 'atividade' | 'demanda' = 'execucao';
  @Input() contextoEntidade: string = '';

  @Output() textoAuxiliadoAceito = new EventEmitter<string>();

  private readonly http = inject(HttpClient);

  textoAuxiliado = signal<string>('');
  carregandoAuxilio = signal<boolean>(false);
  mostrarComparacao = signal<boolean>(false);

  auxiliar(): void {
    this.carregandoAuxilio.set(true);
    this.http
      .post<StandardResponse<AssistenteDescricaoAuxiliadaDto>>(
        `${ambiente.apiUrl}/assistente/auxiliar-descricao`,
        {
          textoOriginal: this.textoAtual,
          tipoEntidade: this.tipoEntidade,
          contextoEntidade: this.contextoEntidade,
        },
      )
      .pipe(finalize(() => this.carregandoAuxilio.set(false)))
      .subscribe((resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.textoAuxiliado.set(resposta.dados.textoAuxiliado);
          this.mostrarComparacao.set(true);
        }
      });
  }

  aceitar(): void {
    this.textoAuxiliadoAceito.emit(this.textoAuxiliado());
    this.mostrarComparacao.set(false);
  }

  descartar(): void {
    this.textoAuxiliado.set('');
    this.mostrarComparacao.set(false);
  }
}
