import { Component, computed, inject, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import {
    ExecucaoEncerradaDto,
    ExecucaoEncerrarDto,
    ExecucaoItemDto,
    MENSAGEM_CARACTERES_PROIBIDOS,
    REGEX_SEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { AtividadeService } from '../../../modules/atividade/services/atividade.service';
import { ExecucaoService } from '../../../modules/execucao/services/execucao.service';
import { iniciaisDoNome } from '../../../modules/execucao/utils/execucao.util';
import { AssistenteDescricaoComponent } from '../assistente-descricao/assistente-descricao.component';
import { BloquearCaracteresProibidosDirective } from '../../directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../directives/dialog-formulario.directive';
import { DataBrasileiraPipe } from '../../pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../pipes/minutos-para-horas.pipe';

/** Dados de uma execução em andamento que o diálogo precisa para encerrá-la. */
export interface ExecucaoEncerrarAbertura {
    execucaoId: number;
    atividadeId: number;
    descricao: string;
    /** Opcional quando o dono da execução é gestor; obrigatória para desenvolvedor (regra do `ExecucaoEncerrarDto`). */
    descricaoOpcional: boolean;
}

/**
 * Diálogo "Encerrar execução", o mesmo da tela de Atividades: descrição com "Auxiliar com IA" e as últimas execuções da
 * atividade. Usado pela tela de Atividades, pelo chip da barra superior e pela tela de Execuções, para que pausar seja sempre
 * a mesma caixa. Quem abre chama `abrir()`; ao encerrar com sucesso emite `encerrada` com os dados da execução fechada.
 */
@Component({
    selector: 'app-execucao-encerrar-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        TextareaModule,
        AssistenteDescricaoComponent,
        BloquearCaracteresProibidosDirective,
        DialogFormularioDirective,
        DataBrasileiraPipe,
        MinutosParaHorasPipe,
    ],
    templateUrl: './execucao-encerrar-dialog.component.html',
    styleUrl: './execucao-encerrar-dialog.component.scss',
})
export class ExecucaoEncerrarDialogComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly execucaoService = inject(ExecucaoService);
    private readonly atividadeService = inject(AtividadeService);
    readonly sessao = inject(UsuarioSessaoService);

    readonly visivel = model<boolean>(false);
    readonly salvando = signal<boolean>(false);
    readonly carregandoExecucoes = signal<boolean>(false);
    readonly execucoes = signal<ExecucaoItemDto[]>([]);
    readonly execucaoAberta = signal<ExecucaoEncerrarAbertura | null>(null);
    readonly encerrada = output<ExecucaoEncerradaDto>();

    readonly formulario = this.formBuilder.group({
        descricao: ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    });
    readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

    /** Cabeçalho (projeto, atividade e dono): vem da própria execução na lista da atividade, que já traz esses nomes. */
    readonly execucaoAtual = computed<ExecucaoItemDto | null>(() => {
        const aberta = this.execucaoAberta();
        return aberta ? (this.execucoes().find((execucao) => execucao.id === aberta.execucaoId) ?? null) : null;
    });

    /** Abre o diálogo para encerrar a execução informada, com a descrição atual já no campo. */
    abrir(abertura: ExecucaoEncerrarAbertura): void {
        this.execucaoAberta.set(abertura);
        this.execucoes.set([]);
        this.formulario.reset({ descricao: abertura.descricao });
        this.formulario.controls.descricao.setValidators(
            abertura.descricaoOpcional
                ? [Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]
                : [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
        );
        this.formulario.controls.descricao.updateValueAndValidity();
        this.carregarExecucoes(abertura.atividadeId);
        this.visivel.set(true);
    }

    iniciais(nomeCompleto: string): string {
        return iniciaisDoNome(nomeCompleto);
    }

    campoInvalido(): boolean {
        const controle = this.formulario.controls.descricao;
        return controle.invalid && controle.touched;
    }

    aceitarDescricaoAssistente(texto: string): void {
        this.formulario.patchValue({ descricao: texto });
    }

    confirmar(): void {
        const aberta = this.execucaoAberta();
        if (!aberta) return;
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }

        const dto: ExecucaoEncerrarDto = { descricao: this.formulario.value.descricao!.trim() };
        this.salvando.set(true);
        this.execucaoService
            .encerrar(aberta.execucaoId, dto)
            .pipe(finalize(() => this.salvando.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (!resposta.sucesso || !resposta.dados) return;
                    this.visivel.set(false);
                    this.encerrada.emit(resposta.dados);
                },
            });
    }

    private carregarExecucoes(atividadeId: number): void {
        this.carregandoExecucoes.set(true);
        this.atividadeService
            .listarExecucoesPorAtividade(atividadeId)
            .pipe(finalize(() => this.carregandoExecucoes.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (resposta.sucesso && resposta.dados) this.execucoes.set(resposta.dados.itens);
                },
            });
    }
}
