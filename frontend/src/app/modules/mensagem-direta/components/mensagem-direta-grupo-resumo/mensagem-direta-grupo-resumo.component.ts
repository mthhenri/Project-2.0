import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
    GrupoResumoIaCriadoDto,
    GrupoResumoIaDestinoEnum,
    GrupoResumoIaEstimadoDto,
    GrupoResumoIaPropostaCriadaDto,
    GrupoResumoIaRecuperadoDto,
} from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { MensagemDiretaGrupoService, PedidoDeResumo } from '../../services/mensagem-direta-grupo.service';

/** Onde o diálogo está: pedir, ver a estimativa, ler o resumo, revisar a proposta de gravar, ou gravado. */
type Etapa = 'FORMULARIO' | 'ESTIMATIVA' | 'RESULTADO' | 'PROPOSTA' | 'GRAVADO';

const DIAS_DO_PERIODO_PADRAO = 7;
const MOTIVO_DE_RESERVA = 'Não foi possível concluir. Tente de novo.';

/** O motivo que o servidor deu (a mensagem de negócio), ou o texto de reserva. */
function motivoDaFalha(erro: unknown): string {
    const motivo = (erro as { error?: { mensagem?: unknown } })?.error?.mensagem;
    return typeof motivo === 'string' && motivo ? motivo : MOTIVO_DE_RESERVA;
}

/**
 * O resumo de um grupo ou canal com a IA (task 249), aberto pelo comando `/resumir` do compositor. A pessoa escolhe o período (com o fim do último resumo à vista)
 * e se o código vai ao provedor (padrão: não), lê o aviso de consentimento, vê a **estimativa** (que não chama a IA) e confirma. O resultado traz o texto, **Copiar** e,
 * no canal, **Gravar na documentação**: vira uma **proposta** que a pessoa revisa e confirma ou descarta (só grava ao confirmar). No grupo livre só se copia.
 */
@Component({
    selector: 'app-mensagem-direta-grupo-resumo',
    standalone: true,
    imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule, ButtonModule, CheckboxModule, DatePickerModule, DialogModule, SelectModule, MarkdownVisualizadorComponent],
    templateUrl: './mensagem-direta-grupo-resumo.component.html',
    styleUrl: './mensagem-direta-grupo-resumo.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaGrupoResumoComponent {
    private readonly api = inject(MensagemDiretaGrupoService);
    private readonly demandaService = inject(DemandaService);

    readonly visivel = model(false);
    readonly grupoId = input.required<number>();
    readonly nomeDoGrupo = input.required<string>();

    protected readonly formulario = new FormGroup({
        inicioData: new FormControl<Date | null>(null),
        fimData: new FormControl<Date | null>(null),
        enviaCodigo: new FormControl(false, { nonNullable: true }),
    });

    protected readonly etapa = signal<Etapa>('FORMULARIO');
    protected readonly carregandoOpcoes = signal(false);
    protected readonly ocupado = signal(false);
    protected readonly erro = signal<string | null>(null);
    protected readonly opcoes = signal<GrupoResumoIaRecuperadoDto | null>(null);
    protected readonly estimativa = signal<GrupoResumoIaEstimadoDto | null>(null);
    protected readonly resultado = signal<GrupoResumoIaCriadoDto | null>(null);
    protected readonly proposta = signal<GrupoResumoIaPropostaCriadaDto | null>(null);
    protected readonly copiado = signal(false);
    protected readonly demandasDoProjeto = signal<{ id: number; rotulo: string }[]>([]);
    protected readonly demandaEscolhida = signal<number | null>(null);
    private temporizadorDoCopiado: ReturnType<typeof setTimeout> | null = null;

    protected readonly podeGravar = computed(() => (this.opcoes()?.destino ?? GrupoResumoIaDestinoEnum.NENHUM) !== GrupoResumoIaDestinoEnum.NENHUM);
    protected readonly pedeDemanda = computed(() => this.opcoes()?.destino === GrupoResumoIaDestinoEnum.PROJETO);
    protected readonly titulo = computed(() => `Resumir com IA · ${this.nomeDoGrupo()}`);
    protected readonly tokensEstimados = computed(() => {
        const estimado = this.estimativa();
        return estimado ? estimado.tokensEntradaEstimados + estimado.tokensSaidaEstimados : 0;
    });
    protected readonly semMensagens = computed(() => this.estimativa()?.quantidadeMensagens === 0);

    constructor() {
        effect(() => {
            if (this.visivel()) untracked(() => void this.abrir());
        });
    }

    /** Começa do zero a cada abertura: o período vai do último resumo (ou de sete dias atrás) até agora. */
    private async abrir(): Promise<void> {
        this.etapa.set('FORMULARIO');
        this.erro.set(null);
        this.estimativa.set(null);
        this.resultado.set(null);
        this.proposta.set(null);
        this.copiado.set(false);
        this.demandaEscolhida.set(null);
        const agora = new Date();
        this.formulario.reset({ inicioData: new Date(agora.getTime() - DIAS_DO_PERIODO_PADRAO * 86_400_000), fimData: agora, enviaCodigo: false });
        this.carregandoOpcoes.set(true);
        try {
            const opcoes = (await firstValueFrom(this.api.recuperarOpcoesDoResumo(this.grupoId()))).dados ?? null;
            this.opcoes.set(opcoes);
            if (opcoes?.ultimoResumoData) this.formulario.patchValue({ inicioData: new Date(opcoes.ultimoResumoData) });
            if (opcoes?.destino === GrupoResumoIaDestinoEnum.PROJETO && opcoes.projetoId) void this.carregarDemandas(opcoes.projetoId);
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.carregandoOpcoes.set(false);
        }
    }

    private async carregarDemandas(projetoId: number): Promise<void> {
        try {
            const resposta = await firstValueFrom(this.demandaService.listar({ projetoId, allRows: true } as never));
            this.demandasDoProjeto.set((resposta.dados?.itens ?? []).map((demanda) => ({ id: demanda.id, rotulo: demanda.caminho || demanda.nome })));
        } catch {
            this.demandasDoProjeto.set([]);
        }
    }

    protected desdeOUltimoResumo(): void {
        const ultimo = this.opcoes()?.ultimoResumoData;
        if (ultimo) this.formulario.patchValue({ inicioData: new Date(ultimo) });
    }

    private lerPedido(): PedidoDeResumo | null {
        const { inicioData, fimData, enviaCodigo } = this.formulario.getRawValue();
        if (!inicioData || !fimData) {
            this.erro.set('Informe o início e o fim do período');
            return null;
        }
        if (fimData.getTime() < inicioData.getTime()) {
            this.erro.set('O fim do período não pode ser anterior ao início');
            return null;
        }
        return { inicioData, fimData, enviaCodigo };
    }

    protected async estimar(): Promise<void> {
        const pedido = this.lerPedido();
        if (!pedido || this.ocupado()) return;
        this.erro.set(null);
        this.ocupado.set(true);
        try {
            this.estimativa.set((await firstValueFrom(this.api.estimarResumo(this.grupoId(), pedido))).dados ?? null);
            this.etapa.set('ESTIMATIVA');
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.ocupado.set(false);
        }
    }

    protected voltarAoPeriodo(): void {
        this.erro.set(null);
        this.etapa.set('FORMULARIO');
    }

    protected async gerar(): Promise<void> {
        const pedido = this.lerPedido();
        if (!pedido || this.ocupado()) return;
        this.erro.set(null);
        this.ocupado.set(true);
        try {
            this.resultado.set((await firstValueFrom(this.api.resumir(this.grupoId(), pedido))).dados ?? null);
            this.etapa.set('RESULTADO');
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.ocupado.set(false);
        }
    }

    protected async copiar(): Promise<void> {
        const texto = this.resultado()?.texto;
        if (!texto) return;
        try {
            await navigator.clipboard.writeText(texto);
            this.copiado.set(true);
            if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
            this.temporizadorDoCopiado = setTimeout(() => this.copiado.set(false), TEMPO_DO_COPIADO_MS);
        } catch {
            this.erro.set('Não foi possível copiar: selecione o texto e copie à mão.');
        }
    }

    protected async pedirGravacao(): Promise<void> {
        const resultado = this.resultado();
        if (!resultado || this.ocupado()) return;
        if (this.pedeDemanda() && !this.demandaEscolhida()) {
            this.erro.set('Escolha a demanda do projeto em que o resumo será gravado');
            return;
        }
        this.erro.set(null);
        this.ocupado.set(true);
        try {
            this.proposta.set((await firstValueFrom(this.api.criarPropostaDoResumo(this.grupoId(), resultado.resumoId, resultado.texto, this.demandaEscolhida() ?? undefined))).dados ?? null);
            this.etapa.set('PROPOSTA');
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.ocupado.set(false);
        }
    }

    protected async confirmarGravacao(): Promise<void> {
        const resultado = this.resultado();
        const proposta = this.proposta();
        if (!resultado || !proposta || this.ocupado()) return;
        this.erro.set(null);
        this.ocupado.set(true);
        try {
            await firstValueFrom(this.api.confirmarPropostaDoResumo(this.grupoId(), resultado.resumoId, proposta.propostaId));
            this.etapa.set('GRAVADO');
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.ocupado.set(false);
        }
    }

    /** Descartar a proposta não grava nada: volta ao resultado, que ainda pode ser copiado ou virar proposta de novo. */
    protected async descartarGravacao(): Promise<void> {
        const resultado = this.resultado();
        const proposta = this.proposta();
        if (!resultado || !proposta || this.ocupado()) return;
        this.ocupado.set(true);
        try {
            await firstValueFrom(this.api.recusarPropostaDoResumo(this.grupoId(), resultado.resumoId, proposta.propostaId));
            this.proposta.set(null);
            this.etapa.set('RESULTADO');
        } catch (falha) {
            this.erro.set(motivoDaFalha(falha));
        } finally {
            this.ocupado.set(false);
        }
    }

    protected fechar(): void {
        this.visivel.set(false);
    }
}
