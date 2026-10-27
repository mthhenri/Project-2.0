import { Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import {
  contarOcorrenciasDoTrecho,
  DemandaRecuperadaDto,
  DemandaTextosAlterarDto,
  EstadoIaEnum,
  PlanoAbaEnum,
  podeEditarAbaDoPlano,
  substituirTrechoUnico,
  TipoDemandaStatusEnum,
} from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownEditorComponent, MenuContextoEditorEvento } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AvisoPedidoDoClienteComponent } from '../../../chat/components/aviso-pedido-do-cliente/aviso-pedido-do-cliente.component';
import { ROTULO_STATUS_DEMANDA } from '../../../demanda/constants/demanda-cores.constants';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { AssistenteTrechoService } from '../../services/assistente-trecho.service';
import { DocumentacaoPropostaComponent, EstadoDaProposta } from '../documentacao-proposta/documentacao-proposta.component';

const AVISO_DE_VERSAO_MAIS_NOVA =
  'Outra pessoa gravou este texto depois que você abriu a demanda. O que você escreveu continua na tela, mas não foi gravado: recarregue para ver a versão dela (o que não foi gravado se perde).';

/** As três abas de texto da demanda, na ordem da tela. */
const ABAS: readonly PlanoAbaEnum[] = [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DESCRICAO_CLIENTE, PlanoAbaEnum.DOCUMENTACAO];

const ROTULO_DA_ABA: Record<PlanoAbaEnum, string> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: 'Técnica',
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: 'Cliente',
  [PlanoAbaEnum.DOCUMENTACAO]: 'Documentação',
};

const ICONE_DA_ABA: Record<PlanoAbaEnum, string> = {
  [PlanoAbaEnum.DESCRICAO_TECNICA]: 'pi-code',
  [PlanoAbaEnum.DESCRICAO_CLIENTE]: 'pi-user',
  [PlanoAbaEnum.DOCUMENTACAO]: 'pi-book',
};

/** O pedido de alteração de um trecho e a resposta da IA (task 260): fica na aba em que foi pedido, até aceitar ou descartar. */
interface PropostaDoTrecho {
  aba: PlanoAbaEnum;
  bloco: string;
  selecao: string;
  pedido: string;
  blocoNovo: string | null;
  estado: 'PEDINDO' | 'PRONTA' | 'ERRO';
  erro: string;
}

/**
 * Os três textos da demanda para escrever (task 259): título, status, "Abrir em Demandas" e as abas Técnica, Cliente e Documentação com o editor de
 * Markdown, Gravar e Descartar, no padrão do documento do plano. Grava pelo endpoint de textos com a versão lida (task 258): versão mais nova (409)
 * avisa e oferece recarregar sem apagar o que foi digitado. Quem não edita a demanda (desenvolvedor de fora) lê as três abas no visualizador; a
 * descrição do cliente é sempre leitura para o desenvolvedor (task 254).
 */
@Component({
  selector: 'app-documentacao-demanda',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PopoverModule,
    SkeletonModule,
    TabsModule,
    TextareaModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    AvisoPedidoDoClienteComponent,
    DemandaStatusMarcaComponent,
    DocumentacaoPropostaComponent,
  ],
  templateUrl: './documentacao-demanda.component.html',
  styleUrl: './documentacao-demanda.component.scss',
})
export class DocumentacaoDemandaComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly roteador = inject(Router);
  private readonly assistenteTrecho = inject(AssistenteTrechoService);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);

  readonly demandaId = input.required<number>();
  /** Algum texto foi mexido e ainda não gravado (a tela pede confirmação antes de trocar de demanda). */
  readonly sujoMudou = output<boolean>();

  readonly Aba = PlanoAbaEnum;
  readonly abas = ABAS;
  readonly rotuloDaAba = ROTULO_DA_ABA;
  readonly iconeDaAba = ICONE_DA_ABA;
  readonly rotuloStatus = ROTULO_STATUS_DEMANDA;
  readonly Status = TipoDemandaStatusEnum;

  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly salvando = signal(false);
  /** Aviso com "Recarregar": outra pessoa gravou antes (409); o que foi escrito continua nos campos. */
  readonly aviso = signal<string | null>(null);
  readonly aba = signal<PlanoAbaEnum>(PlanoAbaEnum.DESCRICAO_TECNICA);

  readonly controleTecnica = new FormControl<string>('', { nonNullable: true });
  readonly controleCliente = new FormControl<string>('', { nonNullable: true });
  readonly controleDocumentacao = new FormControl<string>('', { nonNullable: true });
  private readonly textosEditados = signal({ tecnica: '', cliente: '', documentacao: '' });
  private readonly textosGravados = signal({ tecnica: '', cliente: '', documentacao: '' });

  /** Gestor e administrador sempre; desenvolvedor só em demanda de que é membro (`podeEditar` da API). */
  readonly podeEditar = computed(() => !!this.demanda()?.podeEditar);

  /** A aba é de escrita para esta pessoa? A do cliente só para gestor e administrador, e só se ela edita a demanda. */
  readonly editaAba = computed(() => {
    const tipo = this.sessao.usuarioAtual()?.tipo;
    return (aba: PlanoAbaEnum): boolean => this.podeEditar() && !!tipo && podeEditarAbaDoPlano(aba, tipo);
  });

  /** A IA está de pé? Desligada ou fora do ar, o botão direito volta ao menu do navegador. */
  readonly iaNoAr = computed(() => {
    const estado = this.iaDisponibilidade.estadoReal();
    return estado !== EstadoIaEnum.DESLIGADA && estado !== EstadoIaEnum.FORA_DO_AR;
  });
  /** Pedir à IA vale na aba em que a pessoa pode escrever, com a IA no ar. */
  readonly podePedirIa = computed(() => this.iaNoAr() && this.editaAba()(this.aba()));

  /** O bloco e a seleção, e o pedido que a pessoa está escrevendo à IA (tasks 255 e 260). */
  readonly trechoSelecionado = signal<{ aba: PlanoAbaEnum; bloco: string; selecao: string } | null>(null);
  readonly controlePedido = new FormControl<string>('', { nonNullable: true });
  private readonly popoverDoPedido = viewChild<Popover>('popoverPedido');
  private readonly proposta = signal<PropostaDoTrecho | null>(null);

  /** A proposta da aba aberta, com o estado de agora: pronta vira expirada se o bloco não está mais, uma vez só, no texto da aba. */
  readonly propostaDaAba = computed(() => {
    const proposta = this.proposta();
    if (!proposta || proposta.aba !== this.aba()) return null;
    const estado: EstadoDaProposta =
      proposta.estado === 'PRONTA' && contarOcorrenciasDoTrecho(this.textoEditado(proposta.aba), proposta.bloco) !== 1 ? 'EXPIRADA' : proposta.estado;
    return { ...proposta, estado };
  });

  readonly alterados = computed(() => {
    const editados = this.textosEditados();
    const gravados = this.textosGravados();
    const pode = this.editaAba();
    return {
      tecnica: pode(PlanoAbaEnum.DESCRICAO_TECNICA) && editados.tecnica !== gravados.tecnica,
      cliente: pode(PlanoAbaEnum.DESCRICAO_CLIENTE) && editados.cliente !== gravados.cliente,
      documentacao: pode(PlanoAbaEnum.DOCUMENTACAO) && editados.documentacao !== gravados.documentacao,
    };
  });
  readonly sujo = computed(() => Object.values(this.alterados()).some(Boolean));

  constructor() {
    for (const [campo, controle] of [
      ['tecnica', this.controleTecnica],
      ['cliente', this.controleCliente],
      ['documentacao', this.controleDocumentacao],
    ] as const) {
      controle.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => this.textosEditados.update((atual) => ({ ...atual, [campo]: valor })));
    }
    effect(() => {
      const id = this.demandaId();
      untracked(() => this.carregar(id));
    });
    effect(() => {
      const sujo = this.sujo();
      untracked(() => this.sujoMudou.emit(sujo));
    });
  }

  carregar(id: number = this.demandaId()): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.aviso.set(null);
    this.proposta.set(null);
    this.demandaService.recuperar(id).subscribe({
      next: (resposta) => {
        if (id !== this.demandaId()) return;
        if (!resposta.dados) {
          this.erro.set(true);
          this.carregando.set(false);
          return;
        }
        this.aplicar(resposta.dados);
        this.carregando.set(false);
      },
      error: () => {
        if (id !== this.demandaId()) return;
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  escolherAba(aba: PlanoAbaEnum): void {
    this.aba.set(aba);
  }

  textoDaAba(aba: PlanoAbaEnum): string {
    return this.controleDaAba(aba).value;
  }

  controleDaAba(aba: PlanoAbaEnum): FormControl<string> {
    switch (aba) {
      case PlanoAbaEnum.DESCRICAO_CLIENTE:
        return this.controleCliente;
      case PlanoAbaEnum.DOCUMENTACAO:
        return this.controleDocumentacao;
      default:
        return this.controleTecnica;
    }
  }

  alteradaNaAba(aba: PlanoAbaEnum): boolean {
    const alterados = this.alterados();
    return aba === PlanoAbaEnum.DESCRICAO_TECNICA ? alterados.tecnica : aba === PlanoAbaEnum.DESCRICAO_CLIENTE ? alterados.cliente : alterados.documentacao;
  }

  /** Botão direito sobre uma seleção: abre o pedido de alteração à IA (task 260), com a seleção como alvo e o bloco como contexto. */
  abrirPedido(evento: MenuContextoEditorEvento): void {
    const bloco = evento.texto.trim();
    if (bloco === '') return;
    this.trechoSelecionado.set({ aba: this.aba(), bloco, selecao: evento.selecao.trim() || bloco });
    this.controlePedido.setValue('');
    this.popoverDoPedido()?.show(evento.evento, evento.evento.target as HTMLElement);
  }

  enviarPedido(): void {
    const trecho = this.trechoSelecionado();
    const pedido = this.controlePedido.value.trim();
    if (!trecho || pedido === '') return;
    this.popoverDoPedido()?.hide();
    this.trechoSelecionado.set(null);
    this.pedirAoIa({ aba: trecho.aba, bloco: trecho.bloco, selecao: trecho.selecao, pedido, blocoNovo: null, estado: 'PEDINDO', erro: '' });
  }

  /** "Pedir de novo" e "Tentar de novo": repete o mesmo pedido, sobre o mesmo bloco. */
  repetirPedido(): void {
    const proposta = this.proposta();
    if (proposta) this.pedirAoIa({ ...proposta, blocoNovo: null, estado: 'PEDINDO', erro: '' });
  }

  /** Aceitar troca o bloco no editor e deixa a aba como "Alterações sem gravar": aceitar não grava. */
  aceitarProposta(): void {
    const proposta = this.proposta();
    if (!proposta || proposta.blocoNovo === null) return;
    const trocado = substituirTrechoUnico(this.textoEditado(proposta.aba), proposta.bloco, proposta.blocoNovo);
    if (trocado === null) return;
    this.controleDaAba(proposta.aba).setValue(trocado);
    this.proposta.set(null);
  }

  descartarProposta(): void {
    this.proposta.set(null);
  }

  private pedirAoIa(proposta: PropostaDoTrecho): void {
    const demanda = this.demanda();
    if (!demanda) return;
    this.proposta.set(proposta);
    this.assistenteTrecho.alterarTrecho({ demandaId: demanda.id, aba: proposta.aba, bloco: proposta.bloco, selecao: proposta.selecao, pedido: proposta.pedido }).subscribe({
      next: (resposta) => {
        if (this.proposta() !== proposta) return;
        this.proposta.set({ ...proposta, blocoNovo: resposta.dados?.blocoNovo ?? null, estado: resposta.dados ? 'PRONTA' : 'ERRO', erro: resposta.dados ? '' : 'A IA não devolveu o trecho.' });
      },
      error: (falha: HttpErrorResponse) => {
        if (this.proposta() !== proposta) return;
        this.proposta.set({ ...proposta, estado: 'ERRO', erro: falha.error?.mensagem ?? 'Não foi possível alterar o trecho.' });
      },
    });
  }

  /** O texto de agora da aba, lido do sinal dos campos (não do controle) para a proposta expirar assim que o texto muda. */
  private textoEditado(aba: PlanoAbaEnum): string {
    const editados = this.textosEditados();
    return aba === PlanoAbaEnum.DESCRICAO_TECNICA ? editados.tecnica : aba === PlanoAbaEnum.DESCRICAO_CLIENTE ? editados.cliente : editados.documentacao;
  }

  /** Grava só o que mudou, com a versão lida. */
  salvar(): void {
    const demanda = this.demanda();
    if (!demanda || !this.sujo() || this.salvando()) return;
    const editados = this.textosEditados();
    const mudou = this.alterados();
    const dto: DemandaTextosAlterarDto = {
      versao: demanda.versao,
      ...(mudou.tecnica && { descricaoTecnica: editados.tecnica }),
      ...(mudou.cliente && { descricaoCliente: editados.cliente }),
      ...(mudou.documentacao && { documentacao: editados.documentacao }),
    };
    this.salvando.set(true);
    this.demandaService.alterarTextos(demanda.id, dto).subscribe({
      next: (resposta) => {
        this.salvando.set(false);
        this.aviso.set(null);
        this.demanda.update((atual) => atual && { ...atual, versao: resposta.dados?.versao ?? atual.versao });
        this.textosGravados.update((atual) => ({
          tecnica: mudou.tecnica ? editados.tecnica : atual.tecnica,
          cliente: mudou.cliente ? editados.cliente : atual.cliente,
          documentacao: mudou.documentacao ? editados.documentacao : atual.documentacao,
        }));
      },
      error: (falha: HttpErrorResponse) => {
        this.salvando.set(false);
        if (falha.status === 409) {
          this.aviso.set(AVISO_DE_VERSAO_MAIS_NOVA);
          return;
        }
        this.messageService.add({ severity: 'warn', summary: 'Documentações', detail: falha.error?.mensagem ?? 'Não foi possível gravar os textos' });
      },
    });
  }

  /** Volta os campos ao que foi gravado por último. */
  descartar(): void {
    const gravados = this.textosGravados();
    this.controleTecnica.setValue(gravados.tecnica);
    this.controleCliente.setValue(gravados.cliente);
    this.controleDocumentacao.setValue(gravados.documentacao);
  }

  /** "Abrir em Demandas": leva à tela de Demandas do projeto. */
  abrirEmDemandas(): void {
    const demanda = this.demanda();
    if (demanda) void this.roteador.navigate(['/demanda'], { queryParams: { projetoId: demanda.projetoId } });
  }

  private aplicar(demanda: DemandaRecuperadaDto): void {
    const textos = { tecnica: demanda.descricaoTecnica ?? '', cliente: demanda.descricaoCliente ?? '', documentacao: demanda.documentacao ?? '' };
    this.demanda.set(demanda);
    this.textosGravados.set(textos);
    this.textosEditados.set(textos);
    this.controleTecnica.setValue(textos.tecnica, { emitEvent: false });
    this.controleCliente.setValue(textos.cliente, { emitEvent: false });
    this.controleDocumentacao.setValue(textos.documentacao, { emitEvent: false });
  }
}
