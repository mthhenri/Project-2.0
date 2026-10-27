import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { DemandaRecuperadaDto, DemandaTextosAlterarDto, PlanoAbaEnum, podeEditarAbaDoPlano, TipoDemandaStatusEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AvisoPedidoDoClienteComponent } from '../../../chat/components/aviso-pedido-do-cliente/aviso-pedido-do-cliente.component';
import { ROTULO_STATUS_DEMANDA } from '../../../demanda/constants/demanda-cores.constants';
import { DemandaStatusMarcaComponent } from '../../../demanda/components/demanda-status-marca/demanda-status-marca.component';
import { DemandaService } from '../../../demanda/services/demanda.service';

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
    SkeletonModule,
    TabsModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    AvisoPedidoDoClienteComponent,
    DemandaStatusMarcaComponent,
  ],
  templateUrl: './documentacao-demanda.component.html',
  styleUrl: './documentacao-demanda.component.scss',
})
export class DocumentacaoDemandaComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly roteador = inject(Router);

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
