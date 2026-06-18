import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import {
  AtividadeResumoDto,
  ExecucaoAtivaDto,
  ExecucaoIniciarDto,
  ExecucaoEncerrarDto,
} from '@project20/shared';
import { ExecucaoService } from '../../services/execucao.service';
import { AtividadeService } from '../../../atividade/services/atividade.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { ExecucaoTimerComponent } from '../../components/execucao-timer/execucao-timer.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';

interface AtividadeAtivaInfo {
  id: number;
  nome: string;
}

interface DemandaAtivaInfo {
  id: number;
  nome: string;
  projetoId: number;
}

@Component({
  selector: 'app-execucao-ativa',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    AutoCompleteModule,
    ButtonModule,
    TextareaModule,
    CardModule,
    ProgressSpinnerModule,
    ExecucaoTimerComponent,
    AssistenteDescricaoComponent,
  ],
  templateUrl: './execucao-ativa.page.html',
  styleUrl: './execucao-ativa.page.scss',
})
export class ExecucaoAtivaPage implements OnInit {
  private readonly execucaoService = inject(ExecucaoService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly carregando = signal<boolean>(false);
  readonly execucaoAtiva = signal<ExecucaoAtivaDto | null>(null);
  readonly atividadeAtiva = signal<AtividadeAtivaInfo | null>(null);
  readonly demandaAtiva = signal<DemandaAtivaInfo | null>(null);

  // --- Iniciar nova execução ---
  readonly sugestoesAtividades = signal<AtividadeResumoDto[]>([]);
  readonly salvandoIniciar = signal<boolean>(false);
  readonly formularioIniciar = this.formBuilder.group({
    atividade: [null as AtividadeResumoDto | null, [Validators.required]],
    descricao: ['', [Validators.required]],
  });

  // --- Execução em andamento ---
  readonly salvandoEncerrar = signal<boolean>(false);
  readonly formularioDescricao = this.formBuilder.group({
    descricao: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarEstado();
  }

  carregarEstado(): void {
    this.carregando.set(true);
    this.atividadeAtiva.set(null);
    this.demandaAtiva.set(null);

    this.execucaoService
      .buscarAtiva()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso) return;
          const ativa = resposta.dados ?? null;
          this.execucaoAtiva.set(ativa);
          if (ativa) {
            this.formularioDescricao.reset({ descricao: ativa.descricao });
            this.carregarContextoAtividade(ativa.atividadeId);
          } else {
            this.formularioIniciar.reset({ atividade: null, descricao: '' });
          }
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Iniciar nova execução
  // ---------------------------------------------------------------------------

  buscarSugestoes(evento: AutoCompleteCompleteEvent): void {
    this.atividadeService.listar({ busca: evento.query, itensPorPagina: 20 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.sugestoesAtividades.set(resposta.dados.itens);
      },
    });
  }

  iniciar(): void {
    if (this.formularioIniciar.invalid) {
      this.formularioIniciar.markAllAsTouched();
      return;
    }

    const valor = this.formularioIniciar.value;
    const dto: ExecucaoIniciarDto = {
      atividadeId: valor.atividade!.id,
      descricao: valor.descricao!.trim(),
    };

    this.salvandoIniciar.set(true);
    this.execucaoService
      .iniciar(dto)
      .pipe(finalize(() => this.salvandoIniciar.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução iniciada com sucesso' });
            this.carregarEstado();
          }
        },
      });
  }

  aceitarDescricaoIniciar(texto: string): void {
    this.formularioIniciar.patchValue({ descricao: texto });
  }

  // ---------------------------------------------------------------------------
  // Encerrar execução em andamento
  // ---------------------------------------------------------------------------

  encerrar(): void {
    const ativa = this.execucaoAtiva();
    if (!ativa) return;
    if (this.formularioDescricao.invalid) {
      this.formularioDescricao.markAllAsTouched();
      return;
    }

    const dto: ExecucaoEncerrarDto = { descricao: this.formularioDescricao.value.descricao!.trim() };
    this.salvandoEncerrar.set(true);
    this.execucaoService
      .encerrar(ativa.id, dto)
      .pipe(finalize(() => this.salvandoEncerrar.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução encerrada com sucesso' });
            this.carregarEstado();
          }
        },
      });
  }

  aceitarDescricaoAndamento(texto: string): void {
    this.formularioDescricao.patchValue({ descricao: texto });
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  campoInvalidoIniciar(nomeCampo: string): boolean {
    const controle = this.formularioIniciar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  campoInvalidoDescricao(): boolean {
    const controle = this.formularioDescricao.get('descricao');
    return !!(controle?.invalid && controle?.touched);
  }

  private carregarContextoAtividade(atividadeId: number): void {
    this.atividadeService.recuperar(atividadeId).subscribe({
      next: (resposta) => {
        if (!resposta.sucesso || !resposta.dados) return;
        const atividade = resposta.dados;
        this.atividadeAtiva.set({ id: atividade.id, nome: atividade.nome });
        this.demandaService.recuperar(atividade.demandaId).subscribe({
          next: (respostaDemanda) => {
            if (respostaDemanda.sucesso && respostaDemanda.dados) {
              const demanda = respostaDemanda.dados;
              this.demandaAtiva.set({ id: demanda.id, nome: demanda.nome, projetoId: demanda.projetoId });
            }
          },
        });
      },
    });
  }
}
