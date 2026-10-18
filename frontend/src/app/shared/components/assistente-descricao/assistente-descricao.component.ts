import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { PanelModule } from 'primeng/panel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { of } from 'rxjs';
import { AssistenteDescricaoAuxiliadaDto, StandardResponse } from '@project20/shared';
import { DesfazerService } from '../../../core/services/desfazer.service';
import { ambiente } from '../../../../environments/environment';

/** O backend (`AssistenteDescricaoAuxiliarDto`) recusa texto com menos de 10 caracteres. */
export const MINIMO_CARACTERES_ASSISTENTE = 10;

/** Quanto tempo o "Desfazer" da sugestão aceita fica na tela. */
const DURACAO_DESFAZER_MS = 5000;

/**
 * Assistente de descrição por IA: mostra o texto original ao lado de uma sugestão **editável**, deixa regenerar e, ao aceitar,
 * oferece "Desfazer" (devolve o texto de antes pelo mesmo evento `textoAuxiliadoAceito`, então quem consome não muda nada).
 */
@Component({
  selector: 'app-assistente-descricao',
  standalone: true,
  imports: [ButtonModule, PanelModule, ProgressSpinnerModule, TextareaModule, TooltipModule],
  templateUrl: './assistente-descricao.component.html',
})
export class AssistenteDescricaoComponent {
  @Input() textoAtual: string = '';
  @Input() tipoEntidade: 'execucao' | 'demanda' = 'execucao';
  @Input() contextoEntidade: string = '';

  @Output() textoAuxiliadoAceito = new EventEmitter<string>();

  private readonly http = inject(HttpClient);
  private readonly desfazerService = inject(DesfazerService);

  readonly minimoCaracteres = MINIMO_CARACTERES_ASSISTENTE;

  textoAuxiliado = signal<string>('');
  carregandoAuxilio = signal<boolean>(false);
  mostrarComparacao = signal<boolean>(false);

  /** Só habilita com texto suficiente para o backend aceitar (evita o 400 silencioso). */
  podeAuxiliar(): boolean {
    return this.textoAtual.trim().length >= MINIMO_CARACTERES_ASSISTENTE && !this.carregandoAuxilio();
  }

  auxiliar(): void {
    if (!this.podeAuxiliar()) return;
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

  editarSugestao(evento: Event): void {
    this.textoAuxiliado.set((evento.target as HTMLTextAreaElement).value);
  }

  aceitar(): void {
    const textoAnterior = this.textoAtual;
    this.textoAuxiliadoAceito.emit(this.textoAuxiliado());
    this.mostrarComparacao.set(false);
    this.desfazerService.oferecer({
      mensagem: 'Texto substituído pela sugestão da IA',
      desfazer: () => of(null),
      aposDesfazer: () => this.textoAuxiliadoAceito.emit(textoAnterior),
      duracaoMs: DURACAO_DESFAZER_MS,
      mensagemAposDesfazer: 'Texto anterior restaurado',
    });
  }

  descartar(): void {
    this.textoAuxiliado.set('');
    this.mostrarComparacao.set(false);
  }
}
