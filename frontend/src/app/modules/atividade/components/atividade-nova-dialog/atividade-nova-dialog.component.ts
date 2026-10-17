import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import {
  AtividadeCriarDto,
  DemandaAtribuidaDto,
  MENSAGEM_CARACTERES_PROIBIDOS,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  TagResumoDto,
  TipoAtividadeStatusEnum,
  TipoUsuarioStatusEnum,
  UsuarioResumoDto,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { ATIVIDADE_STATUS_OPCOES } from '../../models/atividade.model';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';

type DemandaAtribuidaOpcao = DemandaAtribuidaDto & { rotulo: string };

/** Dialog de nova atividade: único ponto de criação de atividades (listagem, detalhe da demanda etc.). */
@Component({
  selector: 'app-atividade-nova-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    Select,
    BloquearCaracteresProibidosDirective,
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
  ],
  templateUrl: './atividade-nova-dialog.component.html',
  styleUrl: './atividade-nova-dialog.component.scss',
})
export class AtividadeNovaDialogComponent {
  private readonly atividadeService = inject(AtividadeService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  /** Emite após cada atividade criada, para o chamador recarregar o que exibe. */
  readonly aoCriar = output<void>();

  @ViewChild('campoNovoNome') private campoNovoNome?: ElementRef<HTMLInputElement>;

  readonly visivel = signal<boolean>(false);
  readonly salvando = signal<boolean>(false);
  readonly demandasAtribuidas = signal<DemandaAtribuidaOpcao[]>([]);
  readonly carregandoDemandasAtribuidas = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly carregandoTags = signal<boolean>(false);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  readonly formulario = this.formBuilder.group({
    nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    demandaId: [null as number | null, [Validators.required]],
    usuarioId: [null as number | null],
    status:    [TipoAtividadeStatusEnum.DESENVOLVENDO as TipoAtividadeStatusEnum, [Validators.required]],
    tagIds:    [[] as number[]],
  });

  /** `demandaId`: demanda já selecionada ao abrir (opcional). */
  abrir(demandaId: number | null = null): void {
    this.formulario.reset({
      nome:      '',
      demandaId,
      usuarioId: null,
      status:    TipoAtividadeStatusEnum.DESENVOLVENDO,
      tagIds:    [],
    });
    if (this.demandasAtribuidas().length === 0) this.carregarDemandasAtribuidas();
    if (this.todasAsTags().length === 0) this.carregarTodasAsTags();
    if (this.sessao.eGestor() && this.usuarios().length === 0) this.carregarUsuarios();
    this.visivel.set(true);
  }

  /** `criarOutra`: mantém o dialog aberto (demanda, responsável e status preservados) para cadastro em série. */
  salvar(criarOutra = false): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const valor = this.formulario.value;
    const dto: AtividadeCriarDto = {
      demandaId: valor.demandaId!,
      nome:      valor.nome!,
      status:    valor.status!,
    };
    if (this.sessao.eGestor() && valor.usuarioId) dto.usuarioId = valor.usuarioId;
    if (valor.tagIds?.length) dto.tagIds = valor.tagIds;

    this.atividadeService
      .criar(dto)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso) return;
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Atividade criada com sucesso' });
          if (criarOutra) {
            this.formulario.reset({
              nome:      '',
              demandaId: valor.demandaId,
              usuarioId: valor.usuarioId,
              status:    valor.status,
              tagIds:    valor.tagIds,
            });
            this.campoNovoNome?.nativeElement.focus();
          } else {
            this.visivel.set(false);
          }
          this.aoCriar.emit();
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  alternarTagSelecao(controle: AbstractControl, tagId: number): void {
    const selecionadas = (controle.value as number[] | null) ?? [];
    controle.setValue(
      selecionadas.includes(tagId) ? selecionadas.filter((id) => id !== tagId) : [...selecionadas, tagId],
    );
    controle.markAsDirty();
  }

  tagEstaSelecionada(controle: AbstractControl, tagId: number): boolean {
    return ((controle.value as number[] | null) ?? []).includes(tagId);
  }

  private carregarDemandasAtribuidas(): void {
    this.carregandoDemandasAtribuidas.set(true);
    this.demandaService
      .listarAtribuidas()
      .pipe(finalize(() => this.carregandoDemandasAtribuidas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandasAtribuidas.set(
              resposta.dados.map((demanda) => ({ ...demanda, rotulo: `${demanda.nomeProjeto} - ${demanda.nome}` })),
            );
          }
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

  private carregarUsuarios(): void {
    this.usuarioService.listar({ status: TipoUsuarioStatusEnum.ATIVO, itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }
}
