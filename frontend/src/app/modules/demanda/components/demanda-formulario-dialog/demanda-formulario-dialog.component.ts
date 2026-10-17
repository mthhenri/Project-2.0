import { Component, ElementRef, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, HostListener, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  DemandaAlterarDto,
  DemandaCriarDto,
  DemandaCriadaDto,
  DemandaResumoDto,
  TipoDemandaStatusEnum,
  TagResumoDto,
  UsuarioResumoDto,
  TipoUsuarioEnum,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { HORAS_POR_DIA } from '../../../../core/models/visualizacao-tempo.model';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { AtalhoPrevisao, dataDoAtalho, formatarDataIso, lerDataIso } from '../../utils/demanda-datas.util';

/** Overlays que tratam o próprio Esc antes de o formulário pedir confirmação para fechar. */
const SELETOR_OVERLAY_ABERTO =
  '.p-select-overlay, .p-multiselect-overlay, .p-datepicker-panel, .p-popover, .p-contextmenu, .p-confirmdialog';

/**
 * Formulário único de criar e editar demanda (task 109). Com `demandaId` vira edição, com os mesmos campos
 * da criação (inclusive Tags/Membros para o gestor). Caminho curto: Nome → Pai → Estimativa/Previsão →
 * Estrutural; Status, Membros e Tags ficam em "Mais opções". Marcar estrutural esconde Estimativa e Previsão
 * (a demanda estrutural agrega os filhos).
 */
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
    ConfirmDialogModule,
    BloquearCaracteresProibidosDirective,
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-formulario-dialog.component.html',
  styleUrl: './demanda-formulario-dialog.component.scss',
})
export class DemandaFormularioDialogComponent implements OnChanges {
  /** Projeto da nova demanda; na edição vem da própria demanda. */
  @Input() projetoId = 0;
  @Input() visivel = false;
  @Input() demandaPaiIdInicial: number | null = null;
  /** Presente = modo edição. */
  @Input() demandaId: number | null = null;
  @Output() visivelChange = new EventEmitter<boolean>();
  @Output() demandaCriada = new EventEmitter<DemandaCriadaDto>();
  @Output() demandaAlterada = new EventEmitter<void>();

  private readonly demandaService = inject(DemandaService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  @ViewChild('campoNome') private campoNome?: ElementRef<HTMLInputElement>;

  readonly demandasPaiOpcoes = signal<DemandaResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDados = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly carregandoTags = signal<boolean>(false);
  readonly usuariosDisponiveis = signal<UsuarioResumoDto[]>([]);
  readonly maisOpcoesAbertas = signal<boolean>(false);
  readonly eEdicao = computed(() => this.demandaId !== null);

  /** Tags e membros como estavam ao abrir a edição: base do diff a gravar. */
  private tagIdsOriginais: number[] = [];
  private usuarioIdsOriginais: number[] = [];

  readonly formulario = this.formBuilder.group({
    nome:            ['', [Validators.required, Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
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
    { label: 'Cancelada', value: TipoDemandaStatusEnum.CANCELADA },
  ];

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue !== true) return;

    this.maisOpcoesAbertas.set(false);
    this.formulario.reset({
      nome:           '',
      demandaPaiId:   this.demandaPaiIdInicial ?? null,
      status:         TipoDemandaStatusEnum.PLANEJADA,
      isEstrutural:   false,
      horasEstimadas: 0,
      tagIds:         [],
      usuarioIds:     [],
    });
    if (this.sessao.eGestor()) {
      if (this.todasAsTags().length === 0) this.carregarTodasAsTags();
      if (this.usuariosDisponiveis().length === 0) this.carregarUsuarios();
    }
    if (this.demandaId !== null) this.carregarDemanda(this.demandaId);
    else this.carregarDemandasPai();
  }

  /** Esc fecha com guarda quando há o que perder; overlays abertos (select, calendário…) tratam o Esc antes. */
  @HostListener('document:keydown.escape', ['$event'])
  aoTeclarEscape(evento: Event): void {
    if (!this.visivel || document.querySelector(SELETOR_OVERLAY_ABERTO)) return;
    evento.stopPropagation();
    this.fechar();
  }

  /** Fecha pedindo confirmação se houver texto/alteração ainda não salvos. */
  fechar(): void {
    if (this.temAlteracoesNaoSalvas()) {
      this.confirmationService.confirm({
        key: 'demanda-formulario-fechar',
        header: 'Descartar alterações?',
        message: this.eEdicao() ? 'Você alterou esta demanda e ainda não salvou.' : 'Você começou a preencher esta demanda e ainda não a criou.',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Descartar',
        rejectLabel: 'Continuar editando',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.fecharDeVez(),
      });
      return;
    }
    this.fecharDeVez();
  }

  private fecharDeVez(): void {
    this.visivelChange.emit(false);
  }

  private temAlteracoesNaoSalvas(): boolean {
    if (this.eEdicao()) return this.formulario.dirty;
    return (this.formulario.value.nome ?? '').trim() !== '';
  }

  alternarMaisOpcoes(): void {
    this.maisOpcoesAbertas.update((aberta) => !aberta);
  }

  /** Demandas estruturais agregam os filhos: sem Estimativa nem Previsão próprias. */
  get ocultaEstimativa(): boolean {
    return !!this.formulario.value.isEstrutural;
  }

  aplicarAtalhoPrevisao(atalho: AtalhoPrevisao): void {
    this.formulario.controls.previsaoFimData.setValue(dataDoAtalho(atalho));
    this.formulario.controls.previsaoFimData.markAsDirty();
  }

  /** `criarOutra`: mantém o dialog aberto (pai e contexto preservados) para cadastro em série. */
  salvar(criarOutra = false): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.carregando() || this.carregandoDados()) return;
    if (this.eEdicao()) this.salvarEdicao();
    else this.salvarCriacao(criarOutra);
  }

  private salvarCriacao(criarOutra: boolean): void {
    this.carregando.set(true);
    const valor = this.formulario.value;
    const estrutural = valor.isEstrutural ?? false;

    const dto: DemandaCriarDto = {
      projetoId:       this.projetoId,
      nome:            valor.nome!.trim(),
      demandaPaiId:    valor.demandaPaiId ?? undefined,
      status:          valor.status!,
      isEstrutural:    estrutural,
      horasEstimadas:  estrutural ? 0 : this.paraHorasEstimadas(valor.horasEstimadas),
      previsaoFimData: !estrutural && valor.previsaoFimData ? formatarDataIso(valor.previsaoFimData) : undefined,
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
          if (!resposta.sucesso || !resposta.dados) return;
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Demanda criada com sucesso' });
          this.demandaCriada.emit(resposta.dados);
          if (criarOutra) {
            this.formulario.reset({
              nome:           '',
              demandaPaiId:   valor.demandaPaiId ?? null,
              status:         valor.status,
              isEstrutural:   false,
              horasEstimadas: 0,
              tagIds:         valor.tagIds,
              usuarioIds:     valor.usuarioIds,
            });
            this.campoNome?.nativeElement.focus();
          } else {
            this.fecharDeVez();
          }
        },
      });
  }

  private salvarEdicao(): void {
    const idEditando = this.demandaId!;
    const valor = this.formulario.value;
    const estrutural = valor.isEstrutural ?? false;

    // Estrutural não tem estimativa/previsão próprias: os valores existentes ficam como estão.
    const dto: DemandaAlterarDto = {
      nome:         valor.nome!.trim(),
      demandaPaiId: valor.demandaPaiId ?? undefined,
      status:       valor.status ?? undefined,
      isEstrutural: estrutural,
    };
    if (!estrutural) {
      dto.horasEstimadas = valor.horasEstimadas == null ? undefined : this.paraHorasEstimadas(valor.horasEstimadas);
      dto.previsaoFimData = valor.previsaoFimData ? formatarDataIso(valor.previsaoFimData) : undefined;
    }

    this.carregando.set(true);
    this.demandaService
      .alterar(idEditando, dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          const complementares = this.gravarTagsEMembros(idEditando);
          complementares.subscribe({
            next: () => this.concluirEdicao(),
            error: () => this.concluirEdicao(),
          });
        },
      });
  }

  private concluirEdicao(): void {
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Demanda alterada com sucesso' });
    this.demandaAlterada.emit();
    this.fecharDeVez();
  }

  /** Gestor: grava só o que mudou em tags (PUT) e membros (POST/DELETE individuais). */
  private gravarTagsEMembros(demandaId: number): Observable<unknown> {
    if (!this.sessao.eGestor()) return of(null);
    const valor = this.formulario.value;
    const chamadas: Observable<unknown>[] = [];

    const tagIds = valor.tagIds ?? [];
    if (!this.mesmosIds(tagIds, this.tagIdsOriginais)) {
      chamadas.push(this.demandaService.alterarTags(demandaId, { tagIds }));
    }

    const usuarioIds = valor.usuarioIds ?? [];
    for (const usuarioId of usuarioIds.filter((id) => !this.usuarioIdsOriginais.includes(id))) {
      chamadas.push(this.demandaService.atribuirMembro(demandaId, { usuarioId }));
    }
    for (const usuarioId of this.usuarioIdsOriginais.filter((id) => !usuarioIds.includes(id))) {
      chamadas.push(this.demandaService.removerMembro(demandaId, usuarioId));
    }
    return chamadas.length ? forkJoin(chamadas) : of(null);
  }

  private mesmosIds(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id));
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

  private carregarDemanda(identificador: number): void {
    this.carregandoDados.set(true);
    forkJoin({
      demanda: this.demandaService.recuperar(identificador),
      tags:    this.sessao.eGestor() ? this.demandaService.listarTags(identificador) : of(null),
      membros: this.sessao.eGestor() ? this.demandaService.listarMembros(identificador) : of(null),
    })
      .pipe(finalize(() => this.carregandoDados.set(false)))
      .subscribe({
        next: ({ demanda, tags, membros }) => {
          if (!demanda.sucesso || !demanda.dados) return;
          const dados = demanda.dados;
          this.projetoId = dados.projetoId;
          this.tagIdsOriginais = tags?.dados?.map((tag) => tag.id) ?? [];
          this.usuarioIdsOriginais = membros?.dados?.map((membro) => membro.usuarioId) ?? [];

          this.formulario.reset({
            nome:            dados.nome,
            demandaPaiId:    dados.demandaPaiId ?? null,
            status:          dados.status,
            isEstrutural:    dados.isEstrutural,
            horasEstimadas:  this.unidadeTempo.emDias() ? dados.horasEstimadas / HORAS_POR_DIA : dados.horasEstimadas,
            previsaoFimData: dados.previsaoFimData ? lerDataIso(dados.previsaoFimData) : null,
            tagIds:          this.tagIdsOriginais,
            usuarioIds:      this.usuarioIdsOriginais,
          });
          this.carregarDemandasPai();
        },
      });
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

  /** Candidatas a pai: as estruturais do projeto (na edição, sem a própria demanda). */
  private carregarDemandasPai(): void {
    this.demandaService
      .listar({ projetoId: this.projetoId, isEstrutural: true, itensPorPagina: 200 })
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandasPaiOpcoes.set(resposta.dados.itens.filter((demanda) => demanda.id !== this.demandaId));
          }
        },
      });
  }

  /**
   * Converte o valor do campo (em dias, quando a preferência está em dias) para horas
   * antes de enviar ao backend, que sempre armazena horas. Em horas, passa direto.
   */
  private paraHorasEstimadas(valor: number | null | undefined): number {
    const numero = valor ?? 0;
    return this.unidadeTempo.emDias() ? Math.round(numero * HORAS_POR_DIA) : numero;
  }
}
