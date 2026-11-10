import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import {
    ExecucaoIniciarDto,
    ExecucaoItemDto,
    MENSAGEM_CARACTERES_PROIBIDOS,
    REGEX_SEM_CARACTERES_PROIBIDOS,
    TipoUsuarioEnum,
    temPermissaoDeGestor,
} from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { AtividadeService } from '../../services/atividade.service';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';

/** A atividade que se vai iniciar: só o que o diálogo mostra e usa. */
export interface AtividadeParaIniciar {
    id: number;
    nome: string;
    nomeProjeto: string;
    nomeUsuario: string;
    corAvatar?: string | null;
    usuarioTipo: TipoUsuarioEnum;
}

/**
 * Diálogo "Iniciar execução": a descrição do que vai ser feito (obrigatória quando o dono da atividade é desenvolvedor, opcional quando é gestor)
 * e as últimas execuções da atividade, com "Usar" para retomar uma descrição. Usado pela listagem de atividades e pelo cartão da atividade na
 * demanda aberta; quem abre chama `abrir()` e escuta `iniciada` para se recarregar. Encerrar é o diálogo compartilhado `ExecucaoEncerrarDialog`.
 */
@Component({
    selector: 'app-execucao-iniciar-dialog',
    standalone: true,
    imports: [
        AvatarUsuarioComponent,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        TextareaModule,
        TooltipModule,
        AssistenteDescricaoComponent,
        BloquearCaracteresProibidosDirective,
        DialogDicaAtalhosComponent,
        DialogFormularioDirective,
        DataBrasileiraPipe,
        MinutosParaHorasPipe,
    ],
    templateUrl: './execucao-iniciar-dialog.component.html',
    styleUrl: './execucao-iniciar-dialog.component.scss',
})
export class ExecucaoIniciarDialogComponent {
    private readonly atividadeService = inject(AtividadeService);
    private readonly messageService = inject(MessageService);
    private readonly formBuilder = inject(FormBuilder);
    readonly sessao = inject(UsuarioSessaoService);

    readonly iniciada = output<void>();

    readonly visivel = signal(false);
    readonly salvando = signal(false);
    readonly atividade = signal<AtividadeParaIniciar | null>(null);
    readonly execucoes = signal<ExecucaoItemDto[]>([]);
    readonly carregandoExecucoes = signal(false);
    /** Descrição opcional quando o dono da atividade é gestor. */
    readonly descricaoOpcional = signal(false);
    readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

    readonly formulario = this.formBuilder.group({
        descricao: ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    });

    abrir(atividade: AtividadeParaIniciar): void {
        this.atividade.set(atividade);
        this.formulario.reset({ descricao: '' });
        const donoEhGestor = !!atividade.usuarioTipo && temPermissaoDeGestor(atividade.usuarioTipo);
        this.descricaoOpcional.set(donoEhGestor);
        const controle = this.formulario.controls.descricao;
        controle.setValidators(
            donoEhGestor ? [Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)] : [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
        );
        controle.updateValueAndValidity();
        this.carregarExecucoes(atividade.id);
        this.visivel.set(true);
    }

    confirmar(): void {
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }
        const atividade = this.atividade();
        if (!atividade || this.salvando()) return;

        this.salvando.set(true);
        const dto: ExecucaoIniciarDto = { atividadeId: atividade.id, descricao: this.formulario.value.descricao!.trim() };
        this.atividadeService
            .iniciarExecucao(dto)
            .pipe(finalize(() => this.salvando.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (!resposta.sucesso) return;
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução iniciada com sucesso' });
                    this.visivel.set(false);
                    this.iniciada.emit();
                },
            });
    }

    /** Copia a descrição de uma execução anterior para o campo, para retomar o trabalho sem digitar. */
    usarDescricao(descricao: string): void {
        this.formulario.patchValue({ descricao });
        this.formulario.controls.descricao.markAsDirty();
    }

    aceitarDescricaoDoAssistente(texto: string): void {
        this.formulario.patchValue({ descricao: texto });
    }

    campoInvalido(): boolean {
        const controle = this.formulario.controls.descricao;
        return controle.invalid && controle.touched;
    }

    private carregarExecucoes(atividadeId: number): void {
        this.carregandoExecucoes.set(true);
        this.execucoes.set([]);
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
