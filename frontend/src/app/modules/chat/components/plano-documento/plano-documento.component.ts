import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { PlanoAbaEnum, PlanoAlterarDto, PlanoRecuperadoDto, podeVerAbaDoPlano } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { PlanoService } from '../../services/plano.service';
import { ROTULO_ABA_DO_PLANO } from '../../utils/plano.util';
import { PlanoCabecalhoComponent } from '../plano-cabecalho/plano-cabecalho.component';

/** O que mudou no plano e o seletor precisa saber (título, projeto, demanda, solo, arquivo); `excluido` tira o plano da tela. */
export type MudancaDoPlano = 'titulo' | 'projeto' | 'demanda' | 'solo' | 'arquivo' | 'texto';

/**
 * O documento do plano (task 233): cabeçalho, as abas dos textos e o editor de Markdown, editados à mão e gravados com a `versao` lida.
 * Gravar sobre versão mais nova (409) não perde o que a pessoa escreveu: avisa e oferece recarregar. A aba do cliente só existe para
 * gestor e administrador (`podeVerAbaDoPlano`, do `shared`). Análogo visual: o painel de edição da demanda.
 */
@Component({
  selector: 'app-plano-documento',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, SkeletonModule, TabsModule, MarkdownEditorComponent, PlanoCabecalhoComponent],
  templateUrl: './plano-documento.component.html',
  styleUrl: './plano-documento.component.scss',
})
export class PlanoDocumentoComponent {
  readonly planoId = input.required<number>();

  /** O plano foi lido ou renomeado: quem o abriu mostra o título dele. */
  readonly identificado = output<{ id: number; titulo: string }>();
  readonly mudou = output<MudancaDoPlano>();
  readonly excluido = output<void>();

  private readonly planoService = inject(PlanoService);
  private readonly messageService = inject(MessageService);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly Aba = PlanoAbaEnum;
  readonly rotuloAba = ROTULO_ABA_DO_PLANO;

  readonly plano = signal<PlanoRecuperadoDto | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly salvando = signal(false);
  /** Uma ação do cabeçalho (solo, arquivo, projeto, demanda, título) está em andamento. */
  readonly ocupado = signal(false);
  /** Outra pessoa gravou antes: a gravação foi recusada e o que foi escrito continua nos campos. */
  readonly conflito = signal(false);
  readonly aba = signal<PlanoAbaEnum>(PlanoAbaEnum.DESCRICAO_TECNICA);

  readonly controleTecnica = new FormControl<string>('', { nonNullable: true });
  readonly controleCliente = new FormControl<string>('', { nonNullable: true });
  readonly controleDocumentacao = new FormControl<string>('', { nonNullable: true });
  private readonly textosEditados = signal({ tecnica: '', cliente: '', documentacao: '' });

  readonly abasVisiveis = computed(() => {
    const tipo = this.sessao.usuarioAtual()?.tipo;
    return (Object.values(PlanoAbaEnum) as PlanoAbaEnum[]).filter((aba) => !!tipo && podeVerAbaDoPlano(aba, tipo));
  });
  readonly controleDaAba = computed(() => {
    switch (this.aba()) {
      case PlanoAbaEnum.DESCRICAO_CLIENTE:
        return this.controleCliente;
      case PlanoAbaEnum.DOCUMENTACAO:
        return this.controleDocumentacao;
      default:
        return this.controleTecnica;
    }
  });
  /** Os textos como foram gravados por último, para saber o que a pessoa mexeu. */
  private readonly textosGravados = signal({ tecnica: '', cliente: '', documentacao: '' });
  readonly alterados = computed(() => {
    const editados = this.textosEditados();
    const gravados = this.textosGravados();
    return {
      tecnica: editados.tecnica !== gravados.tecnica,
      cliente: editados.cliente !== gravados.cliente && this.abasVisiveis().includes(PlanoAbaEnum.DESCRICAO_CLIENTE),
      documentacao: editados.documentacao !== gravados.documentacao,
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
      const id = this.planoId();
      untracked(() => this.carregar(id));
    });
  }

  carregar(id: number = this.planoId()): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.conflito.set(false);
    this.planoService.recuperar(id).subscribe({
      next: (resposta) => {
        if (!resposta.dados) {
          this.erro.set(true);
          this.carregando.set(false);
          return;
        }
        this.aplicar(resposta.dados);
        this.identificado.emit({ id: resposta.dados.id, titulo: resposta.dados.titulo });
        if (!this.abasVisiveis().includes(this.aba())) this.aba.set(PlanoAbaEnum.DESCRICAO_TECNICA);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  escolherAba(aba: PlanoAbaEnum): void {
    this.aba.set(aba);
  }

  /** Grava o que mudou nos textos, com a versão lida. */
  salvar(): void {
    const plano = this.plano();
    if (!plano || !this.sujo() || this.salvando()) return;
    const editados = this.textosEditados();
    const mudou = this.alterados();
    const dto: PlanoAlterarDto = {
      versao: plano.versao,
      ...(mudou.tecnica && { descricaoTecnica: editados.tecnica }),
      ...(mudou.cliente && { descricaoCliente: editados.cliente }),
      ...(mudou.documentacao && { documentacao: editados.documentacao }),
    };
    this.salvando.set(true);
    this.planoService.alterar(plano.id, dto).subscribe({
      next: (resposta) => {
        this.salvando.set(false);
        this.conflito.set(false);
        this.plano.update((atual) => atual && { ...atual, versao: resposta.dados?.versao ?? atual.versao });
        this.textosGravados.update((atual) => ({
          tecnica: mudou.tecnica ? editados.tecnica : atual.tecnica,
          cliente: mudou.cliente ? editados.cliente : atual.cliente,
          documentacao: mudou.documentacao ? editados.documentacao : atual.documentacao,
        }));
        this.mudou.emit('texto');
      },
      error: (falha: HttpErrorResponse) => {
        this.salvando.set(false);
        this.tratarFalha(falha, 'Não foi possível gravar o plano');
      },
    });
  }

  alterarTitulo(titulo: string): void {
    const plano = this.plano();
    if (!plano) return;
    this.executar(
      this.planoService.alterar(plano.id, { versao: plano.versao, titulo }),
      (resposta) => {
        this.plano.update((atual) => atual && { ...atual, titulo, versao: resposta.dados?.versao ?? atual.versao });
        this.identificado.emit({ id: plano.id, titulo });
      },
      'titulo',
      'Não foi possível renomear o plano',
    );
  }

  alterarSolo(isSolo: boolean): void {
    const plano = this.plano();
    if (!plano) return;
    this.executar(this.planoService.marcarSolo(plano.id, isSolo), () => this.plano.update((atual) => atual && { ...atual, isSolo }), 'solo', 'Não foi possível alterar o plano');
  }

  alterarArquivo(isArquivado: boolean): void {
    const plano = this.plano();
    if (!plano) return;
    this.executar(
      this.planoService.arquivar(plano.id, isArquivado),
      () => this.plano.update((atual) => atual && { ...atual, isArquivado }),
      'arquivo',
      'Não foi possível arquivar o plano',
    );
  }

  atribuirProjeto(projetoId: number): void {
    const plano = this.plano();
    if (!plano || this.recusarComAlteracoesSemGravar('atribuir o projeto')) return;
    this.executar(this.planoService.atribuirProjeto(plano.id, projetoId), () => this.carregar(plano.id), 'projeto', 'Não foi possível atribuir o projeto');
  }

  /** Ligar a demanda pode preencher as abas vazias com o texto dela e subir a versão, então exige o documento gravado e relê o plano. */
  ligarDemanda(demandaId: number): void {
    const plano = this.plano();
    if (!plano || this.recusarComAlteracoesSemGravar('ligar a demanda')) return;
    this.executar(this.planoService.ligarDemanda(plano.id, demandaId), () => this.carregar(plano.id), 'demanda', 'Não foi possível ligar a demanda');
  }

  excluir(): void {
    const plano = this.plano();
    if (!plano) return;
    this.executar(this.planoService.excluir(plano.id), () => this.excluido.emit(), null, 'Não foi possível excluir o plano');
  }

  /** Ações que relêem o plano não podem passar por cima do que ainda não foi gravado. */
  private recusarComAlteracoesSemGravar(acao: string): boolean {
    if (!this.sujo()) return false;
    this.messageService.add({ severity: 'info', summary: 'Plano', detail: `Grave as alterações antes de ${acao}.` });
    return true;
  }

  private executar<TResposta>(
    chamada: Observable<TResposta>,
    aoConcluir: (resposta: TResposta) => void,
    mudanca: MudancaDoPlano | null,
    mensagemDeFalha: string,
  ): void {
    this.ocupado.set(true);
    chamada.subscribe({
      next: (resposta) => {
        this.ocupado.set(false);
        aoConcluir(resposta);
        if (mudanca) this.mudou.emit(mudanca);
      },
      error: (falha: HttpErrorResponse) => {
        this.ocupado.set(false);
        this.tratarFalha(falha, mensagemDeFalha);
      },
    });
  }

  /** 409 = outra pessoa gravou antes (mostra o aviso com "Recarregar"); os demais erros viram um aviso com a mensagem da API. */
  private tratarFalha(falha: HttpErrorResponse, mensagemPadrao: string): void {
    if (falha.status === 409) {
      this.conflito.set(true);
      return;
    }
    this.messageService.add({ severity: 'warn', summary: 'Plano', detail: falha.error?.mensagem ?? mensagemPadrao });
  }

  private aplicar(plano: PlanoRecuperadoDto): void {
    const textos = { tecnica: plano.descricaoTecnica ?? '', cliente: plano.descricaoCliente ?? '', documentacao: plano.documentacao ?? '' };
    this.plano.set(plano);
    this.textosGravados.set(textos);
    this.textosEditados.set(textos);
    this.controleTecnica.setValue(textos.tecnica, { emitEvent: false });
    this.controleCliente.setValue(textos.cliente, { emitEvent: false });
    this.controleDocumentacao.setValue(textos.documentacao, { emitEvent: false });
  }
}
