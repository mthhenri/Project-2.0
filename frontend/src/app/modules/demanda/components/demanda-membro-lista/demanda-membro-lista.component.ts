import { Component, Input, OnInit, inject, signal } from '@angular/core';
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

  readonly formularioMembro = this.formBuilder.group({
    usuarioIds: [[] as number[], [Validators.required]],
  });

  ngOnInit(): void {
    this.carregarMembros();
  }

  abrirDialog(): void {
    this.formularioMembro.reset({ usuarioIds: [] });
    this.mostrarDialog.set(true);
  }

  atribuirMembros(): void {
    const usuarioIds = this.formularioMembro.value.usuarioIds ?? [];
    if (usuarioIds.length === 0) return;

    const chamadas = usuarioIds.map((usuarioId) => {
      const dto: DemandaUsuarioAtribuirDto = { usuarioId };
      return this.demandaService.atribuirMembro(this.demandaId, dto);
    });

    this.carregandoSalvar.set(true);
    forkJoin(chamadas)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.mostrarDialog.set(false);
          this.carregarMembros();
          const quantidade = usuarioIds.length;
          const detalhe = quantidade === 1 ? 'Membro adicionado' : `${quantidade} membros adicionados`;
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: detalhe });
        },
      });
  }

  confirmarRemocao(membro: DemandaMembroDto): void {
    this.confirmationService.confirm({
      message: `Remover ${membro.nomeCompleto} da demanda?`,
      accept: () => this.removerMembro(membro.usuarioId),
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
