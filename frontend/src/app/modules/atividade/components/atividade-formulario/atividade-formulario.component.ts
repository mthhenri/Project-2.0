import { Component, DestroyRef, ElementRef, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import {
    AtividadeCriarDto,
    DemandaAtribuidaDto,
    MENSAGEM_CARACTERES_PROIBIDOS,
    REGEX_SEM_CARACTERES_PROIBIDOS,
    TipoAtividadePrioridadeEnum,
    TipoAtividadeStatusEnum,
    UsuarioResumoDto,
} from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { AtividadeService } from '../../services/atividade.service';
import { ATIVIDADE_STATUS_OPCOES, severidadeStatusAtividade } from '../../models/atividade.model';

type DemandaAtribuidaOpcao = DemandaAtribuidaDto & { rotulo: string };

/**
 * Formulário de nova atividade. Criar atividade é só pelo dialog (`AtividadeNovaDialogComponent`), que hospeda este formulário,
 * cuida dos botões e chama `salvar()`. Não existe página de criação.
 */
@Component({
    selector: 'app-atividade-formulario',
    standalone: true,
    imports: [ReactiveFormsModule, InputTextModule, Select, PrioridadeSeloComponent, BloquearCaracteresProibidosDirective],
    templateUrl: './atividade-formulario.component.html',
    styleUrl: './atividade-formulario.component.scss',
})
export class AtividadeFormularioComponent implements OnInit {
    private readonly atividadeService = inject(AtividadeService);
    private readonly usuarioService = inject(UsuarioService);
    private readonly demandaService = inject(DemandaService);
    private readonly messageService = inject(MessageService);
    private readonly desfazerService = inject(DesfazerService);
    private readonly router = inject(Router);
    private readonly formBuilder = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    readonly sessao = inject(UsuarioSessaoService);
    protected readonly prioridadeService = inject(AtividadePrioridadeService);

    /** Demanda já escolhida ao abrir (opcional); sem ela o seletor de demanda fica vazio e recebe o foco. */
    readonly demandaIdInicial = input<number | null>(null);
    /** Emite a cada atividade criada: o id, e se o chamador deve manter o formulário aberto (`criarOutra`). */
    readonly criada = output<{ id: number; criarOutra: boolean }>();

    private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');
    private readonly seletorDemanda = viewChild<Select>('seletorDemanda');

    readonly salvando = signal<boolean>(false);
    readonly demandasAtribuidas = signal<DemandaAtribuidaOpcao[]>([]);
    readonly carregandoDemandasAtribuidas = signal<boolean>(false);
    readonly usuarios = signal<UsuarioResumoDto[]>([]);

    readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
    readonly severidadeStatus = severidadeStatusAtividade;
    readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

    readonly formulario = this.formBuilder.group({
        nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
        demandaId: [null as number | null, [Validators.required]],
        usuarioId: [null as number | null],
        status:    [TipoAtividadeStatusEnum.DESENVOLVENDO as TipoAtividadeStatusEnum, [Validators.required]],
        prioridade: [TipoAtividadePrioridadeEnum.INDEFINIDA as TipoAtividadePrioridadeEnum, [Validators.required]],
    });

    ngOnInit(): void {
        this.formulario.patchValue({ demandaId: this.demandaIdInicial() });
        this.prioridadeService.carregar();
        this.carregarDemandasAtribuidas();
        if (this.sessao.eGestor()) {
            this.carregarUsuarios();
            // A atividade só nasce em demanda a que o dono tem acesso: trocar o dono refaz a lista de demandas (task 377).
            this.formulario.controls.usuarioId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.carregarDemandasAtribuidas());
        }
        // Com a demanda definida o foco vai para o nome; sem ela, para o seletor de demanda.
        setTimeout(() => (this.demandaIdInicial() ? this.campoNome()?.nativeElement.focus() : this.seletorDemanda()?.focus()));
    }

    /** `criarOutra`: mantém demanda, responsável, status e prioridade e limpa o nome, para cadastro em série. */
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
            prioridade: valor.prioridade!,
        };
        if (this.sessao.eGestor() && valor.usuarioId) dto.usuarioId = valor.usuarioId;

        this.atividadeService
            .criar(dto)
            .pipe(finalize(() => this.salvando.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (!resposta.sucesso || !resposta.dados) return;
                    const atividadeId = resposta.dados.id;
                    this.avisarCriacao(atividadeId);
                    if (criarOutra) {
                        this.formulario.controls.nome.reset('');
                        this.campoNome()?.nativeElement.focus();
                    }
                    this.criada.emit({ id: atividadeId, criarOutra });
                },
            });
    }

    /** O aviso de criação traz o atalho "Ver atividade" (no lugar do "Desfazer" do toast de ofertas). */
    private avisarCriacao(atividadeId: number): void {
        this.desfazerService.oferecer({
            mensagem: 'Atividade criada com sucesso',
            rotulo: 'Ver atividade',
            desfazer: () => of(null),
            aposDesfazer: () => this.router.navigate(['/atividade', atividadeId]),
            mensagemAposDesfazer: '',
        });
    }

    campoInvalido(nomeCampo: string): boolean {
        const controle = this.formulario.get(nomeCampo);
        return !!(controle?.invalid && controle?.touched);
    }

    private carregarDemandasAtribuidas(): void {
        this.carregandoDemandasAtribuidas.set(true);
        this.demandaService
            .listarAtribuidas(this.sessao.eGestor() ? this.formulario.controls.usuarioId.value : null)
            .pipe(finalize(() => this.carregandoDemandasAtribuidas.set(false)))
            .subscribe({
                next: (resposta) => {
                    if (resposta.sucesso && resposta.dados) {
                        this.demandasAtribuidas.set(
                            resposta.dados.map((demanda) => ({ ...demanda, rotulo: `${demanda.nomeProjeto} - ${demanda.nome}` })),
                        );
                        // A demanda escolhida que o novo dono não tem sai da seleção, para não enviar um pedido que o servidor recusa.
                        const escolhida = this.formulario.controls.demandaId.value;
                        if (escolhida && !resposta.dados.some((demanda) => demanda.id === escolhida)) this.formulario.controls.demandaId.setValue(null);
                    }
                },
            });
    }

    private carregarUsuarios(): void {
        this.usuarioService.listar({ ativo: true, allRows: true }).subscribe({
            next: (resposta) => {
                if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
            },
        });
    }
}
