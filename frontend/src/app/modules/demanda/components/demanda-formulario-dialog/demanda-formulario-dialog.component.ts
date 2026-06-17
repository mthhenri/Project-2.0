import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import {
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaResumoDto,
  DemandaStatusEnum,
  DemandaPrioridadeEnum,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';

@Component({
  selector: 'app-demanda-formulario-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
  ],
  templateUrl: './demanda-formulario-dialog.component.html',
  styleUrl: './demanda-formulario-dialog.component.scss',
})
export class DemandaFormularioDialogComponent implements OnChanges {
  @Input({ required: true }) projetoId!: number;
  @Input() visivel = false;
  @Input() demandaPaiIdInicial: number | null = null;
  @Output() visivelChange = new EventEmitter<boolean>();
  @Output() demandaCriada = new EventEmitter<DemandaCriadaDto>();

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly demandasPaiOpcoes = signal<DemandaResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);

  readonly formulario = this.formBuilder.group({
    nome:            ['', [Validators.required, Validators.maxLength(255)]],
    demandaPaiId:    [null as number | null],
    prioridade:      [DemandaPrioridadeEnum.MEDIA as DemandaPrioridadeEnum, [Validators.required]],
    status:          [DemandaStatusEnum.PENDENTE as DemandaStatusEnum, [Validators.required]],
    isEstrutural:    [false],
    horasEstimadas:  [0, [Validators.required, Validators.min(0)]],
    previsaoFimData: [null as Date | null],
    ordemExibicao:   [0, [Validators.min(0)]],
  });

  readonly prioridadeOpcoes = [
    { label: 'Baixa',   value: DemandaPrioridadeEnum.BAIXA },
    { label: 'Média',   value: DemandaPrioridadeEnum.MEDIA },
    { label: 'Alta',    value: DemandaPrioridadeEnum.ALTA },
    { label: 'Crítica', value: DemandaPrioridadeEnum.CRITICA },
  ];

  readonly statusOpcoes = [
    { label: 'Pendente',  value: DemandaStatusEnum.PENDENTE },
    { label: 'Planejada', value: DemandaStatusEnum.PLANEJADA },
    { label: 'Concluída', value: DemandaStatusEnum.CONCLUIDA },
  ];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.formulario.reset({
        nome:           '',
        demandaPaiId:   this.demandaPaiIdInicial ?? null,
        prioridade:     DemandaPrioridadeEnum.MEDIA,
        status:         DemandaStatusEnum.PENDENTE,
        isEstrutural:   false,
        horasEstimadas: 0,
        ordemExibicao:  0,
      });
      this.carregarDemandasPai();
    }
  }

  fechar(): void {
    this.visivelChange.emit(false);
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    const valor = this.formulario.value;

    const dto: DemandaCriarDto = {
      projetoId:       this.projetoId,
      nome:            valor.nome!,
      demandaPaiId:    valor.demandaPaiId ?? undefined,
      prioridade:      valor.prioridade!,
      status:          valor.status!,
      isEstrutural:    valor.isEstrutural ?? false,
      horasEstimadas:  valor.horasEstimadas ?? 0,
      previsaoFimData: valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
      ordemExibicao:   valor.ordemExibicao ?? 0,
    };

    this.demandaService
      .criar(dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.messageService.add({
              severity: 'success',
              summary: 'Sucesso',
              detail: 'Demanda criada com sucesso',
            });
            this.demandaCriada.emit(resposta.dados);
            this.formulario.reset({
              nome:           '',
              demandaPaiId:   this.demandaPaiIdInicial ?? null,
              prioridade:     DemandaPrioridadeEnum.MEDIA,
              status:         DemandaStatusEnum.PLANEJADA,
              isEstrutural:   false,
              horasEstimadas: 0,
              ordemExibicao:  0,
            });
          }
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private carregarDemandasPai(): void {
    this.demandaService
      .listar({ projetoId: this.projetoId, itensPorPagina: 200 })
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandasPaiOpcoes.set(resposta.dados.itens);
          }
        },
      });
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
