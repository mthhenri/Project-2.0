import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DemandaConexaoResumoDto, DemandaConexaoCriarDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';

@Component({
  selector: 'app-demanda-conexao-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    Select,
    CheckboxModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-conexao-lista.component.html',
  styleUrl: './demanda-conexao-lista.component.scss',
})
export class DemandaConexaoListaComponent implements OnInit {
  @Input({ required: true }) demandaId!: number;
  @Input() todasDemandas = signal<Array<{ demandaConectadaId: number; nomeDemandaConectada: string }>>([]);

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly conexoes = signal<DemandaConexaoResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);

  readonly formularioConexao = this.formBuilder.group({
    demandaDestinoId: [null as number | null, [Validators.required]],
    ehBidirecional:   [false],
  });

  ngOnInit(): void {
    this.carregarConexoes();
  }

  abrirDialog(): void {
    this.formularioConexao.reset({ demandaDestinoId: null, ehBidirecional: false });
    this.mostrarDialog.set(true);
  }

  criarConexao(): void {
    if (this.formularioConexao.invalid) return;

    const valor = this.formularioConexao.value;
    const dto: DemandaConexaoCriarDto = {
      demandaDestinoId: valor.demandaDestinoId!,
      ehBidirecional:   valor.ehBidirecional ?? false,
    };

    this.carregandoSalvar.set(true);
    this.demandaService
      .criarConexao(this.demandaId, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.mostrarDialog.set(false);
          this.carregarConexoes();
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Conexão criada' });
        },
      });
  }

  confirmarExclusao(conexao: DemandaConexaoResumoDto): void {
    this.confirmationService.confirm({
      message: `Excluir conexão com "${conexao.nomeDemandaConectada}"?`,
      accept: () => this.excluirConexao(conexao.id),
    });
  }

  private excluirConexao(conexaoId: number): void {
    this.demandaService
      .excluirConexao(this.demandaId, conexaoId)
      .subscribe({
        next: () => {
          this.carregarConexoes();
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Conexão removida' });
        },
      });
  }

  private carregarConexoes(): void {
    this.carregando.set(true);
    this.demandaService
      .listarConexoes(this.demandaId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.conexoes.set(resposta.dados);
          }
        },
      });
  }
}
