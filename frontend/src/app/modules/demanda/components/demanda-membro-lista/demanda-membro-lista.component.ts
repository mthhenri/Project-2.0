import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelect } from 'primeng/multiselect';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { DemandaMembroDto, DemandaUsuarioAtribuirDto, UsuarioResumoDto, TipoUsuarioEnum } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';

@Component({
  selector: 'app-demanda-membro-lista',
  standalone: true,
  imports: [
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    MultiSelect,
    Tag,
  ],
  templateUrl: './demanda-membro-lista.component.html',
  styleUrl: './demanda-membro-lista.component.scss',
})
export class DemandaMembroListaComponent implements OnInit {
  @Input({ required: true }) demandaId!: number;
  @Input() usuariosDisponiveis = signal<UsuarioResumoDto[]>([]);

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly membros = signal<DemandaMembroDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly tipoEnum = TipoUsuarioEnum;

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

  /** Remoção imediata (task 99): o membro sai na hora e o toast oferece "Desfazer" (re-POST). */
  removerMembro(membro: DemandaMembroDto): void {
    this.retirarMembro(membro);
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

  /** Desenvolvedor sai da demanda: imediato, com "Desfazer" no toast (task 99). */
  sair(): void {
    const usuarioId = this.sessao.id();
    const membro = this.membros().find((item) => item.usuarioId === usuarioId);
    if (membro) this.retirarMembro(membro);
  }

  iniciais(nomeCompleto: string): string {
    return nomeCompleto
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  rotuloTipo(tipo: TipoUsuarioEnum): string {
    return tipo === TipoUsuarioEnum.GESTOR ? 'Gestor' : 'Dev';
  }

  private retirarMembro(membro: DemandaMembroDto): void {
    const listaAnterior = this.membros();
    this.membros.set(listaAnterior.filter((item) => item.usuarioId !== membro.usuarioId));

    this.demandaService.removerMembro(this.demandaId, membro.usuarioId).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `${membro.nomeCompleto} removido da demanda`,
          desfazer: () => this.demandaService.atribuirMembro(this.demandaId, { usuarioId: membro.usuarioId }),
          aposDesfazer: () => this.carregarMembros(),
        }),
      error: () => this.membros.set(listaAnterior),
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
