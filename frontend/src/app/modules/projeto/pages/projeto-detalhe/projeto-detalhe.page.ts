import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  ProjetoRecuperadoDto,
  ProjetoAlterarDto,
  ProjetoStatusEnum,
  DemandaArvoreItemDto,
  DemandaGrafoNoDto,
  TagResumoDto,
  DemandaTagsAtribuirDto,
} from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { DemandaArvoreItemComponent } from '../../../demanda/components/demanda-arvore-item/demanda-arvore-item.component';
import { DemandaFormularioDialogComponent } from '../../../demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaDetalheDialogComponent } from '../../../demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component';
import { DemandaEdicaoDialogComponent } from '../../../demanda/components/demanda-edicao-dialog/demanda-edicao-dialog.component';
import { ambiente } from '../../../../../environments/environment';

@Component({
  selector: 'app-projeto-detalhe',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    Select,
    ColorPickerModule,
    DatePickerModule,
    DialogModule,
    TabsModule,
    Tag,
    TooltipModule,
    DataBrasileiraPipe,
    DemandaArvoreItemComponent,
    DemandaFormularioDialogComponent,
    DemandaDetalheDialogComponent,
    DemandaEdicaoDialogComponent,
  ],
  templateUrl: './projeto-detalhe.page.html',
  styleUrl: './projeto-detalhe.page.scss',
})
export class ProjetoDetalhePage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly demandaService = inject(DemandaService);
  private readonly tagService = inject(TagService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly projeto = signal<ProjetoRecuperadoDto | null>(null);
  readonly arvoreRaizes = signal<DemandaArvoreItemDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDemandas = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  readonly mostrarDialogDetalhe = signal<boolean>(false);
  readonly demandaIdSelecionada = signal<number>(0);
  readonly mostrarDialogEdicao = signal<boolean>(false);
  readonly demandaIdParaEditar = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);
  readonly carregandoSalvar = signal<boolean>(false);

  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly demandaIdTagsEditando = signal<number>(0);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly carregandoSalvarTags = signal<boolean>(false);

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  readonly formularioEditar = this.formBuilder.group(
    {
      nome:            ['', [Validators.required, Validators.maxLength(255)]],
      cor:             ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      status:          [ProjetoStatusEnum.ATIVO as ProjetoStatusEnum, [Validators.required]],
      inicioData:      [null as Date | null],
      previsaoFimData: [null as Date | null],
    },
    { validators: this.validarPrevisaoFim },
  );

  readonly statusOpcoes = [
    { label: 'Ativo',     value: ProjetoStatusEnum.ATIVO },
    { label: 'Pausado',   value: ProjetoStatusEnum.PAUSADO },
    { label: 'Concluído', value: ProjetoStatusEnum.CONCLUIDO },
    { label: 'Cancelado', value: ProjetoStatusEnum.CANCELADO },
  ];

  ngOnInit(): void {
    const identificador = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarProjeto(identificador);
    this.carregarArvore(identificador);
  }

  abrirDialogEditar(): void {
    const projetoDados = this.projeto();
    if (!projetoDados) return;

    this.formularioEditar.patchValue({
      nome:   projetoDados.nome,
      cor:    projetoDados.cor,
      status: projetoDados.status,
      inicioData:      projetoDados.inicioData ? new Date(projetoDados.inicioData + 'T12:00:00') : null,
      previsaoFimData: projetoDados.previsaoFimData ? new Date(projetoDados.previsaoFimData + 'T12:00:00') : null,
    });
    this.mostrarDialogEditar.set(true);
  }

  salvarEdicao(): void {
    if (this.formularioEditar.invalid) {
      this.formularioEditar.markAllAsTouched();
      return;
    }

    const projetoDados = this.projeto();
    if (!projetoDados) return;

    const valor = this.formularioEditar.value;
    const dto: ProjetoAlterarDto = {
      nome:   valor.nome ?? undefined,
      cor:    valor.cor ?? undefined,
      status: valor.status ?? undefined,
      inicioData:      valor.inicioData ? this.formatarData(valor.inicioData) : undefined,
      previsaoFimData: valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
    };

    this.carregandoSalvar.set(true);
    this.projetoService
      .alterar(projetoDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Projeto alterado com sucesso',
          });
          this.mostrarDialogEditar.set(false);
          this.carregarProjeto(projetoDados.id);
        },
      });
  }

  abrirDetalhe(demandaId: number): void {
    this.demandaIdSelecionada.set(demandaId);
    this.mostrarDialogDetalhe.set(true);
  }

  abrirEdicao(demandaId: number): void {
    this.demandaIdParaEditar.set(demandaId);
    this.mostrarDialogEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  aoDemandaAlterada(): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.recarregarArvore(projetoDados.id);
  }

  aoDemandaCriada(): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.recarregarArvore(projetoDados.id);
  }

  abrirDialogTagsPorId(demandaId: number): void {
    this.demandaIdTagsEditando.set(demandaId);

    const carregarTagsDemanda = () => {
      this.demandaService.listarTags(demandaId).subscribe({
        next: (resposta) => {
          const tagIds = resposta.sucesso && resposta.dados ? resposta.dados.map((tag) => tag.id) : [];
          this.formularioTags.patchValue({ tagIds });
          this.mostrarDialogTags.set(true);
        },
      });
    };

    if (this.tagsDisponiveis().length > 0) {
      carregarTagsDemanda();
    } else {
      this.tagService.listar().subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.tagsDisponiveis.set(resposta.dados);
          }
          carregarTagsDemanda();
        },
      });
    }
  }

  salvarTags(): void {
    const idEditando = this.demandaIdTagsEditando();
    if (!idEditando) return;

    const dto: DemandaTagsAtribuirDto = {
      tagIds: this.formularioTags.value.tagIds ?? [],
    };

    this.carregandoSalvarTags.set(true);
    this.demandaService
      .alterarTags(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarTags.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          this.carregarArvore(this.projeto()!.id);
        },
      });
  }

  toggleTag(tagId: number, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    const tagIdsAtuais = [...(this.formularioTags.value.tagIds ?? [])];
    if (marcado) {
      if (!tagIdsAtuais.includes(tagId)) tagIdsAtuais.push(tagId);
    } else {
      const indice = tagIdsAtuais.indexOf(tagId);
      if (indice > -1) tagIdsAtuais.splice(indice, 1);
    }
    this.formularioTags.patchValue({ tagIds: tagIdsAtuais });
  }

  voltarParaListagem(): void {
    this.router.navigate(['/projeto']);
  }

  severidadeStatus(status: ProjetoStatusEnum): 'success' | 'warn' | 'info' | 'danger' {
    const mapa: Record<ProjetoStatusEnum, 'success' | 'warn' | 'info' | 'danger'> = {
      [ProjetoStatusEnum.ATIVO]:     'success',
      [ProjetoStatusEnum.PAUSADO]:   'warn',
      [ProjetoStatusEnum.CONCLUIDO]: 'info',
      [ProjetoStatusEnum.CANCELADO]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: ProjetoStatusEnum): string {
    const mapa: Record<ProjetoStatusEnum, string> = {
      [ProjetoStatusEnum.ATIVO]:     'Ativo',
      [ProjetoStatusEnum.PAUSADO]:   'Pausado',
      [ProjetoStatusEnum.CONCLUIDO]: 'Concluído',
      [ProjetoStatusEnum.CANCELADO]: 'Cancelado',
    };
    return mapa[status];
  }

  campoEditarInvalido(nomeCampo: string): boolean {
    const controle = this.formularioEditar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  get previsaoAnteriorAoInicio(): boolean {
    return !!(
      this.formularioEditar.hasError('previsaoAnteriorAoInicio') &&
      this.formularioEditar.get('previsaoFimData')?.touched
    );
  }

  private carregarProjeto(identificador: number): void {
    this.carregando.set(true);
    this.projetoService
      .recuperar(identificador)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.projeto.set(resposta.dados);
          }
        },
      });
  }

  private carregarArvore(projetoId: number): void {
    this.carregandoDemandas.set(true);
    this.demandaService
      .recuperarGrafo(projetoId)
      .pipe(finalize(() => this.carregandoDemandas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.arvoreRaizes.set(this.construirArvore(resposta.dados.nos));
          }
        },
      });
  }

  private recarregarArvore(projetoId: number): void {
    this.demandaService.recuperarGrafo(projetoId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.arvoreRaizes.set(this.construirArvore(resposta.dados.nos));
        }
      },
    });
  }

  private construirArvore(nos: DemandaGrafoNoDto[]): DemandaArvoreItemDto[] {
    const mapa = new Map<number, DemandaArvoreItemDto>();

    for (const no of nos) {
      mapa.set(no.id, {
        id:                  no.id,
        nome:                no.nome,
        status:              no.status,
        prioridade:          no.prioridade,
        isEstrutural:        no.isEstrutural,
        horasEstimadas:      no.horasEstimadas,
        temDescricaoTecnica: no.temDescricaoTecnica,
        temDescricaoCliente: no.temDescricaoCliente,
        temDocumentacao:     no.temDocumentacao,
        tags:                no.tags ?? [],
        nivel:               0,
        filhos:              [],
      });
    }

    const raizes: DemandaArvoreItemDto[] = [];
    for (const no of nos) {
      const item = mapa.get(no.id)!;
      if (no.demandaPaiId && mapa.has(no.demandaPaiId)) {
        mapa.get(no.demandaPaiId)!.filhos.push(item);
      } else {
        raizes.push(item);
      }
    }

    return raizes;
  }

  digitarCor(evento: Event, controle: AbstractControl | null): void {
    if (!controle) return;
    const valor = (evento.target as HTMLInputElement).value.trim();
    const hexNormalizado = valor.startsWith('#') ? valor : '#' + valor;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexNormalizado)) {
      controle.setValue(hexNormalizado);
    }
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private validarPrevisaoFim(controle: AbstractControl): ValidationErrors | null {
    const inicioData = controle.get('inicioData')?.value as Date | null;
    const previsaoFimData = controle.get('previsaoFimData')?.value as Date | null;
    if (inicioData && previsaoFimData && previsaoFimData <= inicioData) {
      return { previsaoAnteriorAoInicio: true };
    }
    return null;
  }
}
