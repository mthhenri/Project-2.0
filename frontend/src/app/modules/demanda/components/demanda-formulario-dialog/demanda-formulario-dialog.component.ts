import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import {
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaResumoDto,
  TipoDemandaStatusEnum,
  TagResumoDto,
  UsuarioResumoDto,
  TipoUsuarioEnum,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';

@Component({
  selector: 'app-demanda-formulario-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select,
    MultiSelect,
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
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandasPaiOpcoes = signal<DemandaResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly carregandoTags = signal<boolean>(false);
  readonly usuariosDisponiveis = signal<UsuarioResumoDto[]>([]);

  readonly formulario = this.formBuilder.group({
    nome:            ['', [Validators.required, Validators.maxLength(255)]],
    demandaPaiId:    [null as number | null],
    status:          [TipoDemandaStatusEnum.PLANEJADA as TipoDemandaStatusEnum, [Validators.required]],
    isEstrutural:    [false],
    horasEstimadas:  [0, [Validators.required, Validators.min(0)]],
    previsaoFimData: [null as Date | null],
    tagIds:          [[] as number[]],
    usuarioIds:      [[] as number[]],
  });

  readonly statusOpcoes = [
    { label: 'Pendente',  value: TipoDemandaStatusEnum.PENDENTE },
    { label: 'Planejada', value: TipoDemandaStatusEnum.PLANEJADA },
    { label: 'Concluída', value: TipoDemandaStatusEnum.CONCLUIDA },
  ];

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.formulario.reset({
        nome:           '',
        demandaPaiId:   this.demandaPaiIdInicial ?? null,
        status:         TipoDemandaStatusEnum.PLANEJADA,
        isEstrutural:   false,
        horasEstimadas: 0,
        tagIds:         [],
        usuarioIds:     [],
      });
      this.carregarDemandasPai();
      if (this.sessao.eGestor()) {
        if (this.todasAsTags().length === 0) this.carregarTodasAsTags();
        if (this.usuariosDisponiveis().length === 0) this.carregarUsuarios();
      }
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
      status:          valor.status!,
      isEstrutural:    valor.isEstrutural ?? false,
      horasEstimadas:  valor.horasEstimadas ?? 0,
      previsaoFimData: valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
    };
    if (this.sessao.eGestor()) {
      if (valor.tagIds?.length) dto.tagIds = valor.tagIds;
      if (valor.usuarioIds?.length) dto.usuarioIds = valor.usuarioIds;
    }

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
              status:         TipoDemandaStatusEnum.PLANEJADA,
              isEstrutural:   false,
              horasEstimadas: 0,
              tagIds:         [],
              usuarioIds:     [],
            });
          }
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  /** Alterna a seleção de uma tag no controle informado (seletor de chips). */
  alternarTagSelecao(controle: AbstractControl, tagId: number): void {
    const selecionadas = (controle.value as number[] | null) ?? [];
    const novas = selecionadas.includes(tagId)
      ? selecionadas.filter((id) => id !== tagId)
      : [...selecionadas, tagId];
    controle.setValue(novas);
    controle.markAsDirty();
  }

  tagEstaSelecionada(controle: AbstractControl, tagId: number): boolean {
    return ((controle.value as number[] | null) ?? []).includes(tagId);
  }

  private carregarTodasAsTags(): void {
    this.carregandoTags.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => this.carregandoTags.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.todasAsTags.set(resposta.dados);
        },
      });
  }

  /**
   * Lista completa de usuários (GET /usuario) é gestor-only — alimenta o multiselect de membros.
   * Gestores são excluídos: têm acesso total a qualquer demanda por serem gestores, sem
   * necessidade de atribuição em demanda_usuario (task 71).
   */
  private carregarUsuarios(): void {
    this.usuarioService.listar({ itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.usuariosDisponiveis.set(
            resposta.dados.itens.filter((usuario) => usuario.tipo !== TipoUsuarioEnum.GESTOR),
          );
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
