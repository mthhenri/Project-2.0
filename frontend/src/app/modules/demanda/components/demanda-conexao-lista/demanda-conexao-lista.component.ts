import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { DemandaConexaoResumoDto, DemandaConexaoCriarDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';

@Component({
  selector: 'app-demanda-conexao-lista',
  standalone: true,
  imports: [
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    Select,
    CheckboxModule,
  ],
  templateUrl: './demanda-conexao-lista.component.html',
  styleUrl: './demanda-conexao-lista.component.scss',
})
export class DemandaConexaoListaComponent implements OnInit {
  @Input({ required: true }) demandaId!: number;
  @Input() todasDemandas = signal<Array<{ demandaConectadaId: number; nomeDemandaConectada: string }>>([]);

  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
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

  /** Remoção imediata (task 99): a conexão sai na hora e o toast oferece "Desfazer" (re-POST). */
  excluir(conexao: DemandaConexaoResumoDto): void {
    const listaAnterior = this.conexoes();
    this.conexoes.set(listaAnterior.filter((item) => item.id !== conexao.id));

    this.demandaService.excluirConexao(this.demandaId, conexao.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Conexão com "${conexao.nomeDemandaConectada}" removida`,
          desfazer: () => this.recriarConexao(conexao),
          aposDesfazer: () => this.carregarConexoes(),
        }),
      error: () => this.conexoes.set(listaAnterior),
    });
  }

  /** Recria a conexão no sentido original: em "entrada" a origem é a outra demanda. */
  private recriarConexao(conexao: DemandaConexaoResumoDto) {
    if (conexao.direcao === 'entrada') {
      return this.demandaService.criarConexao(conexao.demandaConectadaId, {
        demandaDestinoId: this.demandaId,
        ehBidirecional:   false,
      });
    }
    return this.demandaService.criarConexao(this.demandaId, {
      demandaDestinoId: conexao.demandaConectadaId,
      ehBidirecional:   conexao.direcao === 'bidirecional',
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
