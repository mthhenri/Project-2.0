import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelect } from 'primeng/multiselect';
import { Tag } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DemandaMembroDto, DemandaUsuarioAtribuirDto, UsuarioResumoDto, UsuarioTipoEnum } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';

@Component({
  selector: 'app-demanda-membro-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    MultiSelect,
    Tag,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-membro-lista.component.html',
  styleUrl: './demanda-membro-lista.component.scss',
})
export class DemandaMembroListaComponent implements OnInit {
  @Input({ required: true }) demandaId!: number;
  @Input() usuariosDisponiveis = signal<UsuarioResumoDto[]>([]);

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly membros = signal<DemandaMembroDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly tipoEnum = UsuarioTipoEnum;

  /** Indica se o usuário logado já é membro desta demanda (auto-inclusão/saída do dev). */
  readonly souMembro = computed(() =>
    this.membros().some((membro) => membro.usuarioId === this.sessao.id()),
  );

  readonly formularioMembro = this.formBuilder.group({
    usuarioIds: [[] as number[], [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarMembros();
  }

  abrirDialog(): void {
    this.formularioMembro.reset({ usuarioIds: this.membros().map((membro) => membro.usuarioId) });
    this.mostrarDialog.set(true);
  }

  /**
   * Sincroniza os membros da demanda com a seleção do multiselect: atribui os
   * marcados que ainda não são membros e remove os membros desmarcados.
   */
  salvarMembros(): void {
    const selecionados = this.formularioMembro.value.usuarioIds ?? [];
    const atuais = this.membros().map((membro) => membro.usuarioId);

    const aAdicionar = selecionados.filter((usuarioId) => !atuais.includes(usuarioId));
    const aRemover = atuais.filter((usuarioId) => !selecionados.includes(usuarioId));

    if (aAdicionar.length === 0 && aRemover.length === 0) {
      this.mostrarDialog.set(false);
      return;
    }

    const chamadas = [
      ...aAdicionar.map((usuarioId) => {
        const dto: DemandaUsuarioAtribuirDto = { usuarioId };
        return this.demandaService.atribuirMembro(this.demandaId, dto);
      }),
      ...aRemover.map((usuarioId) => this.demandaService.removerMembro(this.demandaId, usuarioId)),
    ];

    this.carregandoSalvar.set(true);
    forkJoin(chamadas)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.mostrarDialog.set(false);
          this.carregarMembros();
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Membros atualizados' });
        },
      });
  }

  confirmarRemocao(membro: DemandaMembroDto): void {
    this.confirmationService.confirm({
      message: `Remover ${membro.nomeCompleto} da demanda?`,
      accept: () => this.removerMembro(membro.usuarioId),
    });
  }

  /** Desenvolvedor inclui a si mesmo como membro da demanda. */
  participar(): void {
    const usuarioId = this.sessao.id();
    if (usuarioId === undefined) return;

    const dto: DemandaUsuarioAtribuirDto = { usuarioId };
    this.demandaService.atribuirMembro(this.demandaId, dto).subscribe({
      next: () => {
        this.carregarMembros();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Você agora é membro desta demanda' });
      },
    });
  }

  /** Desenvolvedor remove a si mesmo da demanda, com confirmação. */
  confirmarSaida(): void {
    this.confirmationService.confirm({
      message: 'Sair desta demanda?',
      accept: () => {
        const usuarioId = this.sessao.id();
        if (usuarioId !== undefined) this.removerMembro(usuarioId);
      },
    });
  }

  iniciais(nomeCompleto: string): string {
    return nomeCompleto
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  rotuloTipo(tipo: UsuarioTipoEnum): string {
    return tipo === UsuarioTipoEnum.GESTOR ? 'Gestor' : 'Dev';
  }

  private removerMembro(usuarioId: number): void {
    this.demandaService
      .removerMembro(this.demandaId, usuarioId)
      .subscribe({
        next: () => {
          this.carregarMembros();
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Membro removido' });
        },
      });
  }

  private carregarMembros(): void {
    this.carregando.set(true);
    this.demandaService
      .listarMembros(this.demandaId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.membros.set(resposta.dados);
          }
        },
      });
  }
}
