import { Component, ElementRef, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaConexaoResumoDto, DemandaGrafoDto } from '@project20/shared';
import { DemandaGrafoComponent } from '../demanda-grafo/demanda-grafo.component';
import { montarRecorteDeConexoes } from '../../utils/demanda-recorte-conexoes.util';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';

interface DestinoConexao {
    demandaConectadaId: number;
    nomeDemandaConectada: string;
}

const GRUPOS_DE_DIRECAO: { direcao: DemandaConexaoResumoDto['direcao']; titulo: string; icone: string }[] = [
    { direcao: 'saida', titulo: 'Esta demanda depende de', icone: 'pi-arrow-right' },
    { direcao: 'entrada', titulo: 'Dependem desta demanda', icone: 'pi-arrow-left' },
    { direcao: 'bidirecional', titulo: 'Dependência mútua', icone: 'pi-arrows-h' },
];

export type SentidoNovaConexao = 'saida' | 'entrada' | 'mutua';

/**
 * Conexões da demanda (task 108): criação inline (autocomplete com busca + direção + "Adicionar"), erro de
 * ciclo mostrado na própria linha, tooltip semântico da direção, link que navega dentro do detalhe e lixeira
 * com "Desfazer". O estado das conexões vive no dialog (cache de navegação) via `model`.
 *
 * Task 305: com o grafo do projeto em `grafo`, a aba mostra o recorte dele (a demanda e as ligadas a ela, com o tipo escrito ao longo de cada
 * linha, o mesmo `demanda-grafo` do projeto); "+ Conectar" abre a criação com o sentido em três botões; a lista agrupada fica recolhida abaixo.
 * O recorte se mantém vivo pelas `conexoes` (criar e remover refletem na hora), sem esperar o grafo do projeto recarregar.
 */
@Component({
    selector: 'app-demanda-conexao-lista',
    standalone: true,
    imports: [FormsModule, ButtonModule, Select, SelectButtonModule, TooltipModule, DemandaGrafoComponent],
    templateUrl: './demanda-conexao-lista.component.html',
    styleUrl: './demanda-conexao-lista.component.scss',
})
export class DemandaConexaoListaComponent {
    private readonly demandaService = inject(DemandaService);
    private readonly desfazerService = inject(DesfazerService);
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
    readonly sessao = inject(UsuarioSessaoService);

    readonly demandaId = input.required<number>();
    readonly nomeDemanda = input<string>('');
    /** Demandas do projeto que podem ser conectadas (já sem a atual). */
    readonly todasDemandas = input<DestinoConexao[]>([]);
    readonly conexoes = model<DemandaConexaoResumoDto[]>([]);
    /** O grafo do projeto (nós e arestas), de onde sai o recorte; sem ele a aba mostra só a lista. */
    readonly grafo = input<DemandaGrafoDto | null>(null);
    /** O link de uma conexão navega para a demanda conectada dentro do próprio dialog. */
    readonly demandaAbrir = output<number>();
    /** Criou, removeu ou desfez uma conexão: quem hospeda recarrega o grafo do projeto, de onde sai o recorte. */
    readonly conexoesAlteradas = output<void>();

    readonly opcoesSentido: { rotulo: string; valor: SentidoNovaConexao }[] = [
        { rotulo: 'Esta depende dela', valor: 'saida' },
        { rotulo: 'Ela depende desta', valor: 'entrada' },
        { rotulo: 'Mútua', valor: 'mutua' },
    ];

    readonly conectando = signal<boolean>(false);
    readonly destinoId = signal<number | null>(null);
    readonly sentido = signal<SentidoNovaConexao>('saida');
    readonly salvando = signal<boolean>(false);
    readonly erroInline = signal<string | null>(null);

    /** Candidatos: as demandas do projeto que ainda não estão conectadas a esta. */
    readonly candidatos = computed(() => {
        const conectadas = new Set(this.conexoes().map((conexao) => conexao.demandaConectadaId));
        return this.todasDemandas().filter((demanda) => !conectadas.has(demanda.demandaConectadaId));
    });

    /** As conexões agrupadas pelo que significam (o rótulo diz o sentido, sem depender de ícone nem de tooltip). Grupo vazio não aparece. */
    readonly grupos = computed(() =>
        GRUPOS_DE_DIRECAO.map((grupo) => ({ ...grupo, itens: this.conexoes().filter((conexao) => conexao.direcao === grupo.direcao) })).filter((grupo) => grupo.itens.length > 0),
    );

    /** Conexões removidas agora que o grafo do projeto ainda não reflete (a linha some na hora). */
    private readonly removidasAgora = signal<ReadonlySet<number>>(new Set());

    /**
     * O recorte, tirado do grafo do projeto (que traz também as conexões entre as demandas ligadas). Remover pelo × ou pela lixeira tira a linha
     * na hora, sem esperar o grafo recarregar.
     */
    readonly recorte = computed(() => {
        const grafo = this.grafo();
        if (!grafo) return null;
        const removidas = this.removidasAgora();
        const arestas = grafo.arestas.filter((aresta) => aresta.tipo !== 'conexao' || !removidas.has(aresta.id));
        return montarRecorteDeConexoes({ nos: grafo.nos, arestas }, this.demandaId());
    });

    /** Só desenha o recorte quando há conexão a mostrar. */
    readonly mostrarGrafo = computed(() => (this.recorte()?.grafo.nos.length ?? 0) > 1);

    /** A frase de prévia da conexão que será criada. */
    readonly previa = computed(() => {
        const destino = this.todasDemandas().find((demanda) => demanda.demandaConectadaId === this.destinoId());
        if (!destino) return '';
        const esta = this.nomeDemanda() || 'Esta demanda';
        switch (this.sentido()) {
            case 'saida':
                return `"${esta}" depende de "${destino.nomeDemandaConectada}"`;
            case 'entrada':
                return `"${destino.nomeDemandaConectada}" depende de "${esta}"`;
            default:
                return `"${esta}" e "${destino.nomeDemandaConectada}" dependem uma da outra`;
        }
    });

    abrirConexao(): void {
        this.conectando.set(true);
    }

    fecharConexao(): void {
        this.conectando.set(false);
        this.destinoId.set(null);
        this.sentido.set('saida');
        this.erroInline.set(null);
    }

    /** O × do nó no recorte: remove a conexão com aquela demanda (a mesma ação da lixeira da lista). */
    removerPorDemanda(demandaConectadaId: number): void {
        const conexao = this.conexoes().find((item) => item.demandaConectadaId === demandaConectadaId);
        if (conexao) this.excluir(conexao);
    }

    tooltipDirecao(conexao: DemandaConexaoResumoDto): string {
        const outra = `"${conexao.nomeDemandaConectada}"`;
        switch (conexao.direcao) {
            case 'saida':
                return `Esta demanda depende de ${outra}`;
            case 'entrada':
                return `${outra} depende desta demanda`;
            default:
                return `Dependência mútua com ${outra}`;
        }
    }

    /** Escolhido o destino, o foco vai ao "Adicionar": Enter confirma (a lista de opções consome o Enter dela). */
    aoEscolherDestino(id: number | null): void {
        this.destinoId.set(id);
        this.erroInline.set(null);
        if (id) {
            setTimeout(() => this.elemento.nativeElement.querySelector<HTMLButtonElement>('.demanda-conexao-lista__adicionar button')?.focus());
        }
    }

    adicionar(): void {
        const destino = this.destinoId();
        if (!destino || this.salvando()) return;

        this.salvando.set(true);
        this.erroInline.set(null);
        // "Ela depende desta" parte da outra demanda, que passa a ser a origem (quem depende).
        const sentido = this.sentido();
        const criacao =
            sentido === 'entrada'
                ? this.demandaService.criarConexao(destino, { demandaDestinoId: this.demandaId(), bidirecional: false }, true)
                : this.demandaService.criarConexao(this.demandaId(), { demandaDestinoId: destino, bidirecional: sentido === 'mutua' }, true);
        criacao
            .subscribe({
                next: () => {
                    this.salvando.set(false);
                    this.destinoId.set(null);
                    this.sentido.set('saida');
                    this.conectando.set(false);
                    this.recarregar();
                    this.conexoesAlteradas.emit();
                },
                error: (erro: HttpErrorResponse) => {
                    this.salvando.set(false);
                    this.erroInline.set(erro.error?.mensagem ?? 'Não foi possível criar a conexão.');
                },
            });
    }

    /** Remoção imediata: a conexão sai na hora e o toast oferece "Desfazer" (re-POST no sentido original). */
    excluir(conexao: DemandaConexaoResumoDto): void {
        const anteriores = this.conexoes();
        this.conexoes.set(anteriores.filter((item) => item.id !== conexao.id));
        this.removidasAgora.update((ids) => new Set(ids).add(conexao.id));

        // A "depende desta" pertence à outra demanda (a origem): é por ela que se remove.
        const donaDaConexao = conexao.direcao === 'entrada' ? conexao.demandaConectadaId : this.demandaId();
        this.demandaService.excluirConexao(donaDaConexao, conexao.id).subscribe({
            next: () => {
                this.conexoesAlteradas.emit();
                this.desfazerService.oferecer({
                    mensagem: `Conexão com "${conexao.nomeDemandaConectada}" removida`,
                    desfazer: () => this.recriarConexao(conexao),
                    aposDesfazer: () => {
                        this.recarregar();
                        this.conexoesAlteradas.emit();
                    },
                });
            },
            error: () => {
                this.conexoes.set(anteriores);
                this.removidasAgora.update((ids) => new Set([...ids].filter((id) => id !== conexao.id)));
            },
        });
    }

    private recriarConexao(conexao: DemandaConexaoResumoDto) {
        if (conexao.direcao === 'entrada') {
            return this.demandaService.criarConexao(conexao.demandaConectadaId, {
                demandaDestinoId: this.demandaId(),
                bidirecional: false,
            });
        }
        return this.demandaService.criarConexao(this.demandaId(), {
            demandaDestinoId: conexao.demandaConectadaId,
            bidirecional: conexao.direcao === 'bidirecional',
        });
    }

    private recarregar(): void {
        this.demandaService.listarConexoes(this.demandaId()).subscribe((resposta) => {
            if (resposta.sucesso && resposta.dados) this.conexoes.set(resposta.dados);
        });
    }
}
