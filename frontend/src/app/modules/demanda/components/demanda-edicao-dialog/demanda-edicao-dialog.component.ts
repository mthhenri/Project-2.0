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
  DemandaAlterarDto,
  DemandaResumoDto,
  DemandaStatusEnum,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';

@Component({
  selector: 'app-demanda-edicao-dialog',
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
  templateUrl: './demanda-edicao-dialog.component.html',
  styleUrl: './demanda-edicao-dialog.component.scss',
})
export class DemandaEdicaoDialogComponent implements OnChanges {
  @Input({ required: true }) demandaId!: number;
  @Input() visivel = false;
  @Output() visivelChange = new EventEmitter<boolean>();
  @Output() demandaAlterada = new EventEmitter<void>();

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly demandasPaiOpcoes = signal<DemandaResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDados = signal<boolean>(false);

  private projetoId = 0;

  readonly formulario = this.formBuilder.group({
    nome:             ['', [Validators.required, Validators.maxLength(255)]],
    demandaPaiId:     [null as number | null],
    status:           [DemandaStatusEnum.PENDENTE as DemandaStatusEnum, [Validators.required]],
    isEstrutural:     [false],
    horasEstimadas:   [0, [Validators.required, Validators.min(0)]],
    previsaoFimData:  [null as Date | null],
  });

  readonly statusOpcoes = [
    { label: 'Pendente',  value: DemandaStatusEnum.PENDENTE },
    { label: 'Planejada', value: DemandaStatusEnum.PLANEJADA },
    { label: 'Concluída', value: DemandaStatusEnum.CONCLUIDA },
  ];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.carregarDemanda();
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

    const dto: DemandaAlterarDto = {
      nome:             valor.nome ?? undefined,
      demandaPaiId:     valor.demandaPaiId ?? undefined,
      status:           valor.status ?? undefined,
      isEstrutural:     valor.isEstrutural ?? undefined,
      horasEstimadas:   valor.horasEstimadas ?? undefined,
      previsaoFimData:  valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
    };

    this.demandaService
      .alterar(this.demandaId, dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Demanda alterada com sucesso',
          });
          this.demandaAlterada.emit();
          this.visivelChange.emit(false);
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private carregarDemanda(): void {
    this.carregandoDados.set(true);
    this.demandaService
      .recuperar(this.demandaId)
      .pipe(finalize(() => this.carregandoDados.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const demanda = resposta.dados;
            this.projetoId = demanda.projetoId;

            this.formulario.patchValue({
              nome:             demanda.nome,
              demandaPaiId:     demanda.demandaPaiId ?? null,
              status:           demanda.status,
              isEstrutural:     demanda.isEstrutural,
              horasEstimadas:   demanda.horasEstimadas,
              previsaoFimData:  demanda.previsaoFimData
                                  ? new Date(demanda.previsaoFimData + 'T12:00:00')
                                  : null,
            });

            this.carregarDemandasPai();
          }
        },
      });
  }

  private carregarDemandasPai(): void {
    this.demandaService
      .listar({ projetoId: this.projetoId, itensPorPagina: 200 })
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const demandasDisponiveis = resposta.dados.itens.filter(
              (demanda) => demanda.id !== this.demandaId,
            );
            this.demandasPaiOpcoes.set(demandasDisponiveis);
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
