import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import {
  AtividadeCriarDto,
  TipoAtividadeStatusEnum,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS_DICA,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { ATIVIDADE_STATUS_OPCOES } from '../../models/atividade.model';

@Component({
  selector: 'app-atividade-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    Select,
    AssistenteDescricaoComponent,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-formulario.page.html',
  styleUrl: './atividade-formulario.page.scss',
})
export class AtividadeFormularioPage implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly demandaService = inject(DemandaService);
  private readonly router = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formulario = this.formBuilder.group({
    nome:          ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    descricao:     [''],
    status:        [TipoAtividadeStatusEnum.PLANEJADA as TipoAtividadeStatusEnum, [Validators.required]],
  });

  readonly demandaId = signal<number | null>(null);
  readonly nomeDemanda = signal<string>('');
  readonly carregando = signal<boolean>(false);

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly dicaCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS_DICA;

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;

  ngOnInit(): void {
    const demandaIdParam = Number(this.rotaAtiva.snapshot.queryParamMap.get('demandaId'));
    if (Number.isFinite(demandaIdParam) && demandaIdParam > 0) {
      this.demandaId.set(demandaIdParam);
      this.carregarDemanda(demandaIdParam);
    }
  }

  salvar(): void {
    const demandaId = this.demandaId();
    if (!demandaId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Demanda não informada para a atividade',
      });
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);

    const valor = this.formulario.value;
    const dto: AtividadeCriarDto = {
      demandaId,
      nome:          valor.nome!,
      status:        valor.status!,
    };
    const descricao = valor.descricao?.trim();
    if (descricao) dto.descricao = descricao;

    this.atividadeService
      .criar(dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Atividade criada com sucesso',
          });
          this.router.navigate(['/atividade', resposta.dados?.id]);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/atividade'], { queryParams: { demandaId: this.demandaId() } });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formulario.patchValue({ descricao: texto });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private carregarDemanda(demandaId: number): void {
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.nomeDemanda.set(resposta.dados.nome);
        }
      },
    });
  }
}
