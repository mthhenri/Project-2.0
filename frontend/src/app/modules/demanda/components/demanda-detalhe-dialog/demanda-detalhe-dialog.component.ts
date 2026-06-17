import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  DemandaRecuperadaDto,
  DemandaAncestralDto,
  DemandaArvoreItemDto,
  TagResumoDto,
  DemandaTagsAtribuirDto,
  DemandaAlterarDto,
  UsuarioResumoDto,
  DemandaStatusEnum,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaArvoreItemComponent } from '../demanda-arvore-item/demanda-arvore-item.component';
import { DemandaConexaoListaComponent } from '../demanda-conexao-lista/demanda-conexao-lista.component';
import { DemandaMembroListaComponent } from '../demanda-membro-lista/demanda-membro-lista.component';
import { DemandaEdicaoDialogComponent } from '../demanda-edicao-dialog/demanda-edicao-dialog.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

@Component({
  selector: 'app-demanda-detalhe-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    TextareaModule,
    Tag,
    TooltipModule,
    ConfirmDialogModule,
    DemandaArvoreItemComponent,
    DemandaConexaoListaComponent,
    DemandaMembroListaComponent,
    DemandaEdicaoDialogComponent,
    DemandaFormularioDialogComponent,
    AssistenteDescricaoComponent,
    DataBrasileiraPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-detalhe-dialog.component.html',
  styleUrl: './demanda-detalhe-dialog.component.scss',
})
export class DemandaDetalheDialogComponent implements OnChanges {
  @Input({ required: true }) demandaId!: number;
  @Input() visivel = false;
  @Output() visivelChange = new EventEmitter<boolean>();
  @Output() demandaExcluida = new EventEmitter<void>();
  @Output() demandaAlterada = new EventEmitter<void>();

  private readonly demandaService = inject(DemandaService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandaIdAtual = signal<number>(0);
  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly ancestrais = signal<DemandaAncestralDto[]>([]);
  readonly subDemandas = signal<DemandaArvoreItemDto[]>([]);
  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly tagsDaDemanda = signal<TagResumoDto[]>([]);
  readonly todosUsuarios = signal<UsuarioResumoDto[]>([]);
  readonly todasDemandas = signal<Array<{ demandaConectadaId: number; nomeDemandaConectada: string }>>([]);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly mostrarDialogNovaSubDemanda = signal<boolean>(false);
  readonly mostrarDialogSubEdicao = signal<boolean>(false);
  readonly demandaIdSubEdicao = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);
  readonly carregandoSalvar = signal<boolean>(false);

  readonly campoDescricaoEditando = signal<CampoDescricao | null>(null);
  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoSalvarDescricao = signal<boolean>(false);
  readonly demandaIdDescricaoEditando = signal<number>(0);
  readonly nomeDemandaDescricaoEditando = signal<string>('');

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  readonly formularioDescricao = this.formBuilder.group({
    valor: ['' as string | null],
  });

  readonly tituloDialogDescricao = computed(() => {
    const campo = this.campoDescricaoEditando();
    if (!campo) return '';
    const titulos: Record<CampoDescricao, string> = {
      descricaoTecnica: 'Descrição Técnica',
      descricaoCliente: 'Descrição para o Cliente',
      documentacao:     'Documentação',
    };
    return titulos[campo];
  });

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    } else if (mudancas['demandaId'] && !mudancas['demandaId'].firstChange && this.visivel) {
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    }
  }

  fechar(): void {
    this.visivelChange.emit(false);
  }

  aoDemandaAlterada(): void {
    const idAtual = this.demandaIdAtual();
    if (idAtual) this.carregarDemanda(idAtual);
    this.demandaAlterada.emit();
  }

  aoDemandaCriada(): void {
    const idAtual = this.demandaIdAtual();
    if (idAtual) {
      this.demandaService.recuperarArvore(idAtual).subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.subDemandas.set(resposta.dados.filhos ?? []);
          }
        },
      });
    }
  }

  navegarParaSubDemanda(id: number): void {
    this.demandaIdAtual.set(id);
    this.carregarTudo(id);
  }

  abrirSubEdicao(demandaId: number): void {
    this.demandaIdSubEdicao.set(demandaId);
    this.mostrarDialogSubEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  navegarParaAncestral(ancestral: DemandaAncestralDto): void {
    this.demandaIdAtual.set(ancestral.id);
    this.carregarTudo(ancestral.id);
  }

  navegarParaAtividades(): void {
    this.router.navigate(['/atividade'], { queryParams: { demandaId: this.demandaIdAtual() } });
    this.fechar();
  }

  abrirDialogDescricao(campo: CampoDescricao): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;
    const valores: Record<CampoDescricao, string | null | undefined> = {
      descricaoTecnica: demandaDados.descricaoTecnica,
      descricaoCliente: demandaDados.descricaoCliente,
      documentacao:     demandaDados.documentacao,
    };
    this.demandaIdDescricaoEditando.set(demandaDados.id);
    this.nomeDemandaDescricaoEditando.set(demandaDados.nome);
    this.campoDescricaoEditando.set(campo);
    this.formularioDescricao.patchValue({ valor: valores[campo] ?? '' });
    this.mostrarDialogDescricao.set(true);
  }

  abrirDialogDescricaoPorId(demandaId: number, campo: CampoDescricao): void {
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        if (!resposta.sucesso || !resposta.dados) return;
        const demandaDados = resposta.dados;
        const valores: Record<CampoDescricao, string | null | undefined> = {
          descricaoTecnica: demandaDados.descricaoTecnica,
          descricaoCliente: demandaDados.descricaoCliente,
          documentacao:     demandaDados.documentacao,
        };
        this.demandaIdDescricaoEditando.set(demandaId);
        this.nomeDemandaDescricaoEditando.set(demandaDados.nome);
        this.campoDescricaoEditando.set(campo);
        this.formularioDescricao.patchValue({ valor: valores[campo] ?? '' });
        this.mostrarDialogDescricao.set(true);
      },
    });
  }

  salvarDescricao(): void {
    const campo = this.campoDescricaoEditando();
    const idEditando = this.demandaIdDescricaoEditando();
    if (!campo || !idEditando) return;

    this.carregandoSalvarDescricao.set(true);
    const dto = { [campo]: this.formularioDescricao.value.valor ?? undefined } as DemandaAlterarDto;

    this.demandaService
      .alterar(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarDescricao.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `${this.tituloDialogDescricao()} salva` });
          this.mostrarDialogDescricao.set(false);
          if (idEditando === this.demanda()?.id) {
            this.carregarDemanda(idEditando);
          }
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formularioDescricao.patchValue({ valor: texto });
  }

  abrirDialogTags(): void {
    const tagIdsAtuais = this.tagsDaDemanda().map((tag) => tag.id);
    this.formularioTags.patchValue({ tagIds: tagIdsAtuais });
    this.mostrarDialogTags.set(true);
  }

  salvarTags(): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;

    const dto: DemandaTagsAtribuirDto = { tagIds: this.formularioTags.value.tagIds ?? [] };

    this.carregandoSalvar.set(true);
    this.demandaService
      .alterarTags(demandaDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          this.carregarTagsDaDemanda(demandaDados.id);
        },
      });
  }

  confirmarExclusao(): void {
    this.confirmationService.confirm({
      message: 'Excluir esta demanda? Esta ação não pode ser desfeita.',
      accept: () => this.excluirDemanda(),
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

  severidadeStatus(status: DemandaStatusEnum): 'secondary' | 'info' | 'success' {
    const mapa: Record<DemandaStatusEnum, 'secondary' | 'info' | 'success'> = {
      [DemandaStatusEnum.PENDENTE]:  'secondary',
      [DemandaStatusEnum.PLANEJADA]: 'info',
      [DemandaStatusEnum.CONCLUIDA]: 'success',
    };
    return mapa[status];
  }

  rotuloStatus(status: DemandaStatusEnum): string {
    const mapa: Record<DemandaStatusEnum, string> = {
      [DemandaStatusEnum.PENDENTE]:  'Pendente',
      [DemandaStatusEnum.PLANEJADA]: 'Planejada',
      [DemandaStatusEnum.CONCLUIDA]:          'Concluída',
    };
    return mapa[status];
  }

  private excluirDemanda(): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;

    this.demandaService.excluir(demandaDados.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Demanda excluída' });
        this.demandaExcluida.emit();
        this.visivelChange.emit(false);
      },
    });
  }

  private carregarTudo(identificador: number): void {
    this.carregando.set(true);
    this.demanda.set(null);
    this.mostrarDialogEditar.set(false);
    this.mostrarDialogNovaSubDemanda.set(false);

    forkJoin({
      demanda:    this.demandaService.recuperar(identificador),
      ancestrais: this.demandaService.recuperarAncestral(identificador),
      arvore:     this.demandaService.recuperarArvore(identificador),
      tags:       this.tagService.listar(),
      usuarios:   this.usuarioService.listar({ itensPorPagina: 100 }),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ demanda, ancestrais, arvore, tags, usuarios }) => {
          if (demanda.sucesso && demanda.dados) {
            this.demanda.set(demanda.dados);
            this.carregarTagsDaDemanda(identificador);
            this.carregarDemandasParaConexao(demanda.dados.projetoId, identificador);
          }
          if (ancestrais.sucesso && ancestrais.dados) {
            this.ancestrais.set(ancestrais.dados);
          }
          if (arvore.sucesso && arvore.dados) {
            this.subDemandas.set(arvore.dados.filhos ?? []);
          }
          if (tags.sucesso && tags.dados) {
            this.tagsDisponiveis.set(tags.dados);
          }
          if (usuarios.sucesso && usuarios.dados) {
            this.todosUsuarios.set(usuarios.dados.itens);
          }
        },
      });
  }

  private carregarDemanda(identificador: number): void {
    this.demandaService.recuperar(identificador).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.demanda.set(resposta.dados);
        }
      },
    });
  }

  private carregarTagsDaDemanda(demandaId: number): void {
    this.demandaService.listarTags(demandaId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.tagsDaDemanda.set(resposta.dados);
        }
      },
    });
  }

  private carregarDemandasParaConexao(projetoId: number, demandaIdAtual: number): void {
    this.demandaService.listar({ projetoId, itensPorPagina: 200 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          const demandasConexao = resposta.dados.itens
            .filter((demanda) => demanda.id !== demandaIdAtual)
            .map((demanda) => ({
              demandaConectadaId:   demanda.id,
              nomeDemandaConectada: demanda.nome,
            }));
          this.todasDemandas.set(demandasConexao);
        }
      },
    });
  }
}
