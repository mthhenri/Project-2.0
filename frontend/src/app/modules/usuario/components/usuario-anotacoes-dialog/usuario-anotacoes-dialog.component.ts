import { Component, DestroyRef, inject, signal, computed, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { EditorModule } from 'primeng/editor';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { anotacaoTemTexto, tempoDecorrido } from '../../utils/anotacoes.util';

/** Quanto tempo sem digitar até o salvamento automático. */
const ESPERA_AUTO_SAVE_MS = 2000;
/** Janela do "Desfazer" do Limpar: o vazio só é gravado depois dela. */
const JANELA_LIMPAR_MS = 7000;

type EstadoSalvamento = 'ocioso' | 'editando' | 'salvando' | 'salvo' | 'erro';

export interface AnotacoesAlteradasEvento {
  usuarioId: number;
  temAnotacoes: boolean;
}

/**
 * Anotações num drawer lateral (task 114). Salva sozinho: cada mudança agenda um PUT 2 s depois,
 * fechar descarrega na hora e nenhuma requisição sai sem mudança real. Não há confirmação ao
 * fechar — fechar salva. "Limpar" é reversível por 7 s (o vazio só é gravado depois).
 */
@Component({
  selector: 'app-usuario-anotacoes-dialog',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ButtonModule, DrawerModule, EditorModule, SkeletonModule, TooltipModule],
  templateUrl: './usuario-anotacoes-dialog.component.html',
  styleUrl: './usuario-anotacoes-dialog.component.scss',
})
export class UsuarioAnotacoesDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitido a cada salvamento bem-sucedido, para a listagem atualizar o ícone sem recarregar. */
  readonly aoAlterar = output<AnotacoesAlteradasEvento>();

  readonly visivel = signal(false);
  readonly carregando = signal(false);
  readonly estado = signal<EstadoSalvamento>('ocioso');
  readonly salvoEm = signal<Date | null>(null);
  readonly alteracaoData = signal<Date | string | null>(null);
  private readonly agora = signal(new Date());
  private readonly usuarioId = signal(0);
  private readonly nomeCompleto = signal('');

  readonly formulario = this.formBuilder.group({ anotacoes: [''] });

  private conteudoSalvo = '';
  private temporizadorSalvar: ReturnType<typeof setTimeout> | null = null;
  private temporizadorRelogio: ReturnType<typeof setInterval> | null = null;
  private salvandoRequisicao = false;
  private salvarDeNovo = false;
  /** Conteúdo que existia antes do "Limpar", enquanto a janela do Desfazer está aberta. */
  private conteudoAntesDeLimpar: string | null = null;

  readonly titulo = computed(() =>
    this.sessao.id() === this.usuarioId() ? 'Minhas anotações' : `Anotações de ${this.nomeCompleto()}`,
  );

  readonly editadoHa = computed(() => {
    const data = this.alteracaoData();
    return data ? `Editado ${tempoDecorrido(data, this.agora())}` : 'Sem alterações registradas';
  });

  constructor() {
    this.formulario.controls.anotacoes.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((conteudo) => this.aoDigitar(conteudo ?? ''));

    this.destroyRef.onDestroy(() => {
      this.pararRelogio();
      this.cancelarAgendamento();
      // A página saiu de cena: nada digitado ou limpo pode ficar para trás.
      if (this.conteudoAntesDeLimpar !== null) this.desfazerService.dispensar();
      else this.salvarAgora();
    });
  }

  /** Abre o drawer para o usuário informado; sem `nomeCompleto`, usa o devolvido pela API. */
  abrir(usuarioId: number, nomeCompleto = ''): void {
    if (this.usuarioId() !== usuarioId) this.encerrarPendencias();
    this.usuarioId.set(usuarioId);
    this.nomeCompleto.set(nomeCompleto);
    this.carregar(usuarioId);
    this.visivel.set(true);
    this.iniciarRelogio();
  }

  /** X, Esc ou clique fora: fechar salva — sem confirmação. */
  aoMudarVisibilidade(visivel: boolean): void {
    if (visivel) return;
    this.visivel.set(false);
    this.pararRelogio();
    if (this.conteudoAntesDeLimpar === null) this.salvarAgora(true);
  }

  /** Foca o editor assim que o Quill existe. */
  aoIniciarEditor(evento: { editor: { focus: () => void } }): void {
    setTimeout(() => evento.editor.focus());
  }

  salvar(): void {
    if (this.conteudoAntesDeLimpar !== null) return;
    this.salvarAgora();
  }

  /** Esvazia o editor e deixa 7 s para desfazer; só depois o vazio é gravado. */
  limpar(): void {
    const anterior = this.formulario.controls.anotacoes.value ?? '';
    if (!anotacaoTemTexto(anterior) || this.conteudoAntesDeLimpar !== null) return;

    this.cancelarAgendamento();
    this.conteudoAntesDeLimpar = anterior;
    this.formulario.controls.anotacoes.setValue('', { emitEvent: false });
    this.estado.set('editando');

    const usuarioId = this.usuarioId();
    this.desfazerService.oferecer({
      mensagem: 'Anotações limpas',
      duracaoMs: JANELA_LIMPAR_MS,
      mensagemAposDesfazer: '',
      desfazer: () => of(null),
      aposDesfazer: () => this.restaurarAposLimpar(),
      aoEncerrar: () => this.gravarLimpeza(usuarioId),
    });
  }

  private aoDigitar(conteudo: string): void {
    if (this.conteudoAntesDeLimpar !== null) {
      // Digitar na janela do Desfazer é aceitar a limpeza e continuar escrevendo.
      this.conteudoAntesDeLimpar = null;
      this.desfazerService.dispensarSemEncerrar();
    }
    if (conteudo === this.conteudoSalvo) {
      this.cancelarAgendamento();
      this.estado.set(this.salvoEm() ? 'salvo' : 'ocioso');
      return;
    }
    this.estado.set('editando');
    this.cancelarAgendamento();
    this.temporizadorSalvar = setTimeout(() => this.salvarAgora(), ESPERA_AUTO_SAVE_MS);
  }

  /** PUT imediato do que mudou; sem mudança real, não sai requisição. `aoFechar` oferece "Reabrir" se falhar. */
  private salvarAgora(aoFechar = false): void {
    this.cancelarAgendamento();
    const id = this.usuarioId();
    const enviado = this.formulario.controls.anotacoes.value ?? '';
    if (!id || this.carregando() || enviado === this.conteudoSalvo) return;
    if (this.salvandoRequisicao) {
      this.salvarDeNovo = true;
      return;
    }

    this.salvandoRequisicao = true;
    this.estado.set('salvando');
    this.usuarioService
      .alterar(id, { anotacoes: enviado }, true)
      .pipe(finalize(() => {
        this.salvandoRequisicao = false;
        if (this.salvarDeNovo) {
          this.salvarDeNovo = false;
          this.salvarAgora(aoFechar);
        }
      }))
      .subscribe({
        next: (resposta) => {
          this.conteudoSalvo = enviado;
          this.salvoEm.set(new Date());
          this.agora.set(new Date());
          this.alteracaoData.set(resposta.dados?.anotacoesAlteracaoData ?? this.alteracaoData());
          this.estado.set((this.formulario.controls.anotacoes.value ?? '') === enviado ? 'salvo' : 'editando');
          this.aoAlterar.emit({ usuarioId: id, temAnotacoes: anotacaoTemTexto(resposta.dados?.anotacoes ?? enviado) });
        },
        error: () => {
          this.estado.set('erro');
          if (aoFechar && !this.visivel()) this.oferecerReabrir(id, enviado);
        },
      });
  }

  private oferecerReabrir(usuarioId: number, conteudo: string): void {
    this.desfazerService.oferecer({
      mensagem: 'Não foi possível salvar as anotações',
      rotulo: 'Reabrir',
      mensagemAposDesfazer: '',
      desfazer: () => of(null),
      aposDesfazer: () => {
        this.usuarioId.set(usuarioId);
        this.visivel.set(true);
        this.iniciarRelogio();
        this.formulario.controls.anotacoes.setValue(conteudo);
      },
    });
  }

  private restaurarAposLimpar(): void {
    const anterior = this.conteudoAntesDeLimpar;
    this.conteudoAntesDeLimpar = null;
    if (anterior === null) return;
    this.formulario.controls.anotacoes.setValue(anterior, { emitEvent: false });
    this.estado.set(anterior === this.conteudoSalvo ? (this.salvoEm() ? 'salvo' : 'ocioso') : 'editando');
    if (anterior !== this.conteudoSalvo) this.aoDigitar(anterior);
  }

  /** A janela do Desfazer acabou: grava o vazio (com o id de quando o usuário limpou). */
  private gravarLimpeza(usuarioId: number): void {
    if (this.conteudoAntesDeLimpar === null) return;
    this.conteudoAntesDeLimpar = null;
    if (this.usuarioId() === usuarioId) {
      this.formulario.controls.anotacoes.setValue('', { emitEvent: false });
      this.salvarAgora();
    } else {
      this.usuarioService.alterar(usuarioId, { anotacoes: '' }, true).subscribe({
        next: () => this.aoAlterar.emit({ usuarioId, temAnotacoes: false }),
      });
    }
  }

  /** Trocar de usuário com algo pendente: grava o que estava em edição antes de carregar o outro. */
  private encerrarPendencias(): void {
    if (this.conteudoAntesDeLimpar !== null) this.desfazerService.dispensar();
    else this.salvarAgora();
  }

  private carregar(usuarioId: number): void {
    this.carregando.set(true);
    this.estado.set('ocioso');
    this.salvoEm.set(null);
    this.usuarioService
      .recuperar(usuarioId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso || !resposta.dados || this.usuarioId() !== usuarioId) return;
          const conteudo = resposta.dados.anotacoes ?? '';
          if (!this.nomeCompleto()) this.nomeCompleto.set(resposta.dados.nomeCompleto);
          this.conteudoSalvo = conteudo;
          this.formulario.controls.anotacoes.setValue(conteudo, { emitEvent: false });
          this.alteracaoData.set(resposta.dados.anotacoesAlteracaoData ?? null);
        },
        error: () => this.visivel.set(false),
      });
  }

  private cancelarAgendamento(): void {
    if (this.temporizadorSalvar !== null) clearTimeout(this.temporizadorSalvar);
    this.temporizadorSalvar = null;
  }

  private iniciarRelogio(): void {
    this.agora.set(new Date());
    this.pararRelogio();
    this.temporizadorRelogio = setInterval(() => this.agora.set(new Date()), 30000);
  }

  private pararRelogio(): void {
    if (this.temporizadorRelogio !== null) clearInterval(this.temporizadorRelogio);
    this.temporizadorRelogio = null;
  }
}
