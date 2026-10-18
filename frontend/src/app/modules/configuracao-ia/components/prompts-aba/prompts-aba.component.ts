import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PromptResumoDto, PromptTipoResumoDto, TipoPromptEnum } from '@project20/shared';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PromptService } from '../../services/prompt.service';
import { PromptTesteDialogComponent } from '../prompt-teste-dialog/prompt-teste-dialog.component';

/**
 * Aba "Prompts" das Configurações da IA (task 133, exclusiva de administrador). Cada tipo tem uma versão ativa, no máximo um
 * rascunho e o histórico; o texto de uma versão nunca é reescrito. Salvar o rascunho é um botão explícito (o efeito de ativar é
 * global), e sair com mudança pendente pergunta antes. Análogo visual: a aba "Provedor e modelos" (cartões com borda e título).
 */
@Component({
  selector: 'app-prompts-aba',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MenuModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    PromptTesteDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './prompts-aba.component.html',
  styleUrl: './prompts-aba.component.scss',
})
export class PromptsAbaComponent implements OnInit {
  private readonly promptService = inject(PromptService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly desfazerService = inject(DesfazerService);

  readonly tipos = signal<PromptTipoResumoDto[]>([]);
  readonly tipoAberto = signal<TipoPromptEnum | null>(null);
  readonly versoes = signal<PromptResumoDto[]>([]);
  readonly versaoVista = signal<PromptResumoDto | null>(null);
  readonly carregando = signal(true);
  readonly carregandoTipo = signal(false);
  readonly erro = signal(false);
  readonly operando = signal(false);
  readonly testando = signal(false);
  /** O texto que está no editor, para o teste (candidato). */
  readonly textoParaTeste = computed(() => this.textoEditado());

  /** Texto do editor do rascunho. */
  readonly controleRascunho = new FormControl<string>('', { nonNullable: true });
  private readonly textoEditado = signal('');
  /** Texto que o editor tinha ao abrir (rascunho salvo, ou a versão ativa quando não há rascunho). */
  private readonly textoBase = signal('');

  readonly tipoAtual = computed(() => this.tipos().find((tipo) => tipo.tipo === this.tipoAberto()) ?? null);
  readonly mudancaPendente = computed(() => this.textoEditado() !== this.textoBase());
  /** Há rascunho gravado e o editor está igual a ele. */
  readonly podeAtivar = computed(() => !!this.tipoAtual()?.rascunho && !this.mudancaPendente());
  readonly podeSalvar = computed(() => this.mudancaPendente() && this.textoEditado().trim() !== '');
  /** Ativa e antigas, do maior número para o menor (o rascunho não entra: ele tem o próprio editor). */
  readonly versoesNavegaveis = computed(() => {
    const lista = this.versoes().filter((versao) => !versao.rascunho);
    const ativa = this.tipoAtual()?.ativa;
    return lista.length > 0 || !ativa ? lista : [ativa];
  });
  /** Versão exibida no cartão: a escolhida no histórico ou, sem escolha, a ativa. */
  readonly versaoExibida = computed(() => this.versaoVista() ?? this.tipoAtual()?.ativa ?? null);
  readonly indiceExibido = computed(() => this.versoesNavegaveis().findIndex((versao) => versao.id === this.versaoExibida()?.id));
  readonly temAntiga = computed(() => this.indiceExibido() >= 0 && this.indiceExibido() < this.versoesNavegaveis().length - 1);
  readonly temNova = computed(() => this.indiceExibido() > 0);
  readonly exibindoAtiva = computed(() => !this.versaoVista());
  private readonly menuHistorico = viewChild<Menu>('menuHistorico');
  /** Itens do menu "Histórico": uma linha por versão, a exibida marcada. */
  readonly itensHistorico = computed<MenuItem[]>(() =>
    this.versoesNavegaveis().map((versao) => ({
      label: `Versão ${versao.versao}${versao.ativo ? ' (ativa)' : ''} · ${versao.usuarioNome}`,
      icon: versao.id === this.versaoExibida()?.id ? 'pi pi-check' : 'pi pi-fw',
      command: () => this.exibirVersao(versao),
    })),
  );

  ngOnInit(): void {
    this.controleRascunho.valueChanges.subscribe((valor) => this.textoEditado.set(valor));
    this.carregarTipos(null);
  }

  /** `true` quando pode sair/trocar de tela: sem mudança pendente, ou o administrador aceitou perdê-la. */
  podeSair(): Promise<boolean> {
    if (!this.mudancaPendente()) return Promise.resolve(true);
    return new Promise((resolver) => {
      this.confirmationService.confirm({
        key: 'prompts-pendente',
        header: 'Alterações não salvas',
        message: 'O rascunho tem alterações que ainda não foram salvas. Sair agora as descarta.',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Descartar e sair',
        rejectLabel: 'Continuar editando',
        accept: () => resolver(true),
        reject: () => resolver(false),
      });
    });
  }

  carregarTipos(tipoParaAbrir: TipoPromptEnum | null): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.promptService.listarTipos().subscribe({
      next: (resposta) => {
        if (!resposta.dados) {
          this.erro.set(true);
          this.carregando.set(false);
          return;
        }
        this.tipos.set(resposta.dados);
        this.carregando.set(false);
        const alvo = tipoParaAbrir ?? this.tipoAberto() ?? resposta.dados[0]?.tipo ?? null;
        if (alvo) this.abrirTipo(alvo);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  async escolherTipo(tipo: TipoPromptEnum): Promise<void> {
    if (tipo === this.tipoAberto()) return;
    if (!(await this.podeSair())) return;
    this.abrirTipo(tipo);
  }

  private abrirTipo(tipo: TipoPromptEnum): void {
    this.tipoAberto.set(tipo);
    this.versaoVista.set(null);
    this.versoes.set([]);
    this.carregandoTipo.set(true);
    const resumo = this.tipos().find((item) => item.tipo === tipo);
    this.preencherEditor(resumo?.rascunho?.conteudo ?? resumo?.ativa.conteudo ?? '');

    this.promptService.listarVersoes(tipo).subscribe({
      next: (resposta) => {
        if (this.tipoAberto() !== tipo) return;
        this.versoes.set(resposta.dados?.itens ?? []);
        this.carregandoTipo.set(false);
      },
      error: () => this.carregandoTipo.set(false),
    });
  }

  private preencherEditor(texto: string): void {
    this.textoBase.set(texto);
    this.textoEditado.set(texto);
    this.controleRascunho.setValue(texto, { emitEvent: false });
  }

  salvarRascunho(): void {
    const tipo = this.tipoAberto();
    if (!tipo || !this.podeSalvar() || this.operando()) return;
    this.operando.set(true);
    this.promptService.salvarRascunho(tipo, { conteudo: this.controleRascunho.value }).subscribe({
      next: (resposta) => {
        this.operando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
        this.carregarTipos(tipo);
      },
      error: () => this.operando.set(false),
    });
  }

  ativarRascunho(): void {
    const tipo = this.tipoAberto();
    if (!tipo || !this.podeAtivar() || this.operando()) return;
    this.confirmationService.confirm({
      key: 'prompts-acao',
      header: 'Ativar o rascunho',
      message: 'O rascunho passa a valer para todos os usuários agora. A versão ativa continua no histórico.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ativar',
      rejectLabel: 'Cancelar',
      accept: () => this.executarAtivacao(tipo),
    });
  }

  private executarAtivacao(tipo: TipoPromptEnum): void {
    this.operando.set(true);
    this.promptService.ativarRascunho(tipo).subscribe({
      next: (resposta) => {
        this.operando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
        this.carregarTipos(tipo);
      },
      error: () => this.operando.set(false),
    });
  }

  restaurarPadrao(): void {
    const tipo = this.tipoAberto();
    if (!tipo || this.operando()) return;
    this.confirmationService.confirm({
      key: 'prompts-acao',
      header: 'Restaurar o prompt padrão',
      message:
        'A versão 1 (o texto original do sistema) volta a ser a ativa para todos os usuários. A versão ativa atual continua no histórico.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Restaurar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.operando.set(true);
        this.promptService.restaurarPadrao(tipo).subscribe({
          next: (resposta) => {
            this.operando.set(false);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
            this.carregarTipos(tipo);
          },
          error: () => this.operando.set(false),
        });
      },
    });
  }

  /** Descarta o rascunho gravado; o toast oferece "Desfazer", que grava o mesmo texto de novo como rascunho. */
  descartarRascunho(): void {
    const tipo = this.tipoAberto();
    const rascunho = this.tipoAtual()?.rascunho;
    if (!tipo || !rascunho || this.operando()) return;
    this.operando.set(true);
    this.promptService.descartarRascunho(tipo).subscribe({
      next: () => {
        this.operando.set(false);
        this.carregarTipos(tipo);
        this.desfazerService.oferecer({
          mensagem: 'Rascunho descartado',
          desfazer: () => this.promptService.salvarRascunho(tipo, { conteudo: rascunho.conteudo }),
          aposDesfazer: () => this.carregarTipos(tipo),
        });
      },
      error: () => this.operando.set(false),
    });
  }

  /** Volta o editor ao último texto gravado. */
  descartarAlteracoes(): void {
    this.preencherEditor(this.textoBase());
  }

  /** Mostra a versão no cartão; a ativa volta ao estado sem escolha. */
  exibirVersao(versao: PromptResumoDto): void {
    this.versaoVista.set(versao.ativo ? null : versao);
  }

  /** Setas do cartão: `+1` vai para a versão de número menor, `-1` para a de número maior. */
  navegar(passo: 1 | -1): void {
    const alvo = this.versoesNavegaveis()[this.indiceExibido() + passo];
    if (alvo) this.exibirVersao(alvo);
  }

  abrirMenuHistorico(evento: Event): void {
    this.menuHistorico()?.toggle(evento);
  }

  /** Coloca o texto da versão no editor; nada é gravado até "Salvar rascunho". */
  usarComoBase(versao: PromptResumoDto): void {
    this.controleRascunho.setValue(versao.conteudo);
    this.versaoVista.set(null);
    this.messageService.add({
      severity: 'info',
      summary: 'Texto carregado',
      detail: `Texto da versão ${versao.versao} no editor. Salve o rascunho para guardá-lo.`,
    });
  }

  recarregar(): void {
    this.carregarTipos(this.tipoAberto());
  }
}
