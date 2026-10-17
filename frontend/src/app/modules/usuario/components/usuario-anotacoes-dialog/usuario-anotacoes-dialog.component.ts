import { Component, DestroyRef, inject, signal, computed, input, output, viewChild, viewChildren } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { MenuItem, MessageService } from 'primeng/api';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AnotacaoResumoDto, AnotacaoTrechoMovidoDto, TIPOS_ANOTACAO_ORDENADOS, TipoAnotacaoEnum } from '@project20/shared';
import { MarkdownEditorComponent, MenuContextoEditorEvento } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AnotacaoService } from '../../services/anotacao.service';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { anotacaoTemTexto, ROTULO_SECAO_ANOTACAO, tempoDecorrido } from '../../utils/anotacoes.util';
import { EstadoSalvamento, SecaoAnotacao } from './secao-anotacao';

/** Quanto tempo sem digitar até o salvamento automático. */
const ESPERA_AUTO_SAVE_MS = 2000;
/** Janela do "Desfazer" do Limpar: o vazio só é gravado depois dela. */
const JANELA_LIMPAR_MS = 7000;
/** Seções abertas quando o pad abre. */
const SECOES_ABERTAS_AO_ABRIR: TipoAnotacaoEnum[] = [TipoAnotacaoEnum.EM_ANDAMENTO];
/** Pior estado primeiro: é o que o rodapé mostra quando as seções divergem. */
const PRIORIDADE_ESTADO: EstadoSalvamento[] = ['erro', 'salvando', 'editando', 'salvo', 'ocioso'];

export interface AnotacoesAlteradasEvento {
  usuarioId: number;
  temAnotacoes: boolean;
}

/**
 * Pad do usuário num drawer lateral, em cinco acordeões (tasks 114 e 126). Cada seção salva sozinha:
 * cada mudança agenda um PUT 2 s depois, fechar descarrega na hora e nenhuma requisição sai sem mudança
 * real. Não há confirmação ao fechar — fechar salva. "Limpar" é reversível por 7 s (o vazio só é
 * gravado depois). O PUT leva a versão lida da seção; se ela mudou em outro lugar (IA, outra aba) o
 * servidor responde 409 e a seção é recarregada com um aviso.
 */
@Component({
  selector: 'app-usuario-anotacoes-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    ContextMenuModule,
    DrawerModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './usuario-anotacoes-dialog.component.html',
  styleUrl: './usuario-anotacoes-dialog.component.scss',
})
export class UsuarioAnotacoesDialogComponent {
  private readonly anotacaoService = inject(AnotacaoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Falso mostra cada seção só no visualizador, sem salvar e sem "Limpar" (os blocos 4 e 10 acionam isso). */
  readonly editavel = input(true);

  /** Emitido a cada salvamento bem-sucedido, para a listagem atualizar o ícone sem recarregar. */
  readonly aoAlterar = output<AnotacoesAlteradasEvento>();

  readonly visivel = signal(false);
  readonly carregando = signal(false);
  readonly secoes = signal<SecaoAnotacao[]>([]);
  readonly secoesAbertas = signal<TipoAnotacaoEnum[]>(SECOES_ABERTAS_AO_ABRIR);
  readonly rotuloSecao = ROTULO_SECAO_ANOTACAO;
  readonly alteracaoData = signal<Date | string | null>(null);
  private readonly agora = signal(new Date());
  private readonly usuarioId = signal(0);
  private readonly nomeCompleto = signal('');
  private readonly editores = viewChildren(MarkdownEditorComponent);
  private readonly menuContexto = viewChild<ContextMenu>('menuContexto');

  /**
   * Menu do botão direito sobre um trecho selecionado: "Enviar para" com as cinco seções (a de origem fica
   * oculta ao abrir). Itens são propriedades diretas (um getter reconstruiria o menu a cada ciclo e ele fecharia).
   */
  readonly itensMenu: MenuItem[] = [
    {
      label: 'Enviar para',
      icon: 'pi pi-send',
      items: TIPOS_ANOTACAO_ORDENADOS.map((tipo): MenuItem => ({
        id: tipo,
        label: ROTULO_SECAO_ANOTACAO[tipo],
        command: () => this.enviarTrecho(tipo),
      })),
    },
  ];
  /** Seção e trecho do menu aberto (lidos quando um destino é escolhido). */
  private trechoDoMenu: { secao: SecaoAnotacao; texto: string } | null = null;

  private temporizadorRelogio: ReturnType<typeof setInterval> | null = null;

  readonly titulo = computed(() =>
    this.sessao.id() === this.usuarioId() ? 'Minhas anotações' : `Anotações de ${this.nomeCompleto()}`,
  );

  readonly editadoHa = computed(() => {
    const data = this.alteracaoData();
    return data ? `Editado ${tempoDecorrido(data, this.agora())}` : 'Sem alterações registradas';
  });

  /** Estado do rodapé: o pior entre as seções. */
  readonly estadoGeral = computed<EstadoSalvamento>(() => {
    const estados = this.secoes().map((secao) => secao.estado());
    return PRIORIDADE_ESTADO.find((estado) => estados.includes(estado)) ?? 'ocioso';
  });

  readonly salvoEmGeral = computed<Date | null>(() => {
    const datas = this.secoes().map((secao) => secao.salvoEm()).filter((data): data is Date => data !== null);
    return datas.length ? new Date(Math.max(...datas.map((data) => data.getTime()))) : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.pararRelogio();
      // A página saiu de cena: nada digitado ou limpo pode ficar para trás.
      this.descarregar({ dispensarLimpeza: true });
      this.secoes().forEach((secao) => secao.encerrar());
    });
  }

  /** Abre o drawer para o usuário informado; sem `nomeCompleto`, usa o devolvido pela API. */
  abrir(usuarioId: number, nomeCompleto = ''): void {
    if (this.usuarioId() !== usuarioId) this.descarregar({ dispensarLimpeza: true });
    this.usuarioId.set(usuarioId);
    this.nomeCompleto.set(nomeCompleto);
    this.carregar(usuarioId);
    this.visivel.set(true);
    this.iniciarRelogio();
  }

  /** X, Esc ou clique fora: fechar salva — sem confirmação. */
  aoMudarVisibilidade(visivel: boolean): void {
    if (visivel) return;
    this.visivel.set(false);
    this.pararRelogio();
    this.descarregar({ aoFechar: true });
  }

  aoMudarSecoesAbertas(valor: unknown): void {
    this.secoesAbertas.set(Array.isArray(valor) ? (valor as TipoAnotacaoEnum[]) : []);
  }

  /** Ctrl+S ou o botão: grava agora todas as seções com mudança pendente. */
  salvar(): void {
    this.secoes().forEach((secao) => {
      if (!secao.limpando) this.salvarAgora(secao);
    });
  }

  /** Botão direito sobre um trecho selecionado: mostra "Enviar para" sem a própria seção. */
  abrirMenuDoTrecho(secao: SecaoAnotacao, selecao: MenuContextoEditorEvento): void {
    if (!this.editavel()) return;
    this.trechoDoMenu = { secao, texto: selecao.texto };
    this.itensMenu[0].items?.forEach((item) => (item.visible = item.id !== secao.tipo));
    this.menuContexto()?.show(selecao.evento);
  }

  /** Esvazia a seção e deixa 7 s para desfazer; só depois o vazio é gravado. */
  limpar(secao: SecaoAnotacao): void {
    const anterior = secao.textoAtual;
    if (!this.editavel() || !anotacaoTemTexto(anterior) || secao.limpando) return;

    secao.cancelarAgendamento();
    secao.conteudoAntesDeLimpar = anterior;
    secao.controle.setValue('', { emitEvent: false });
    secao.temTexto.set(false);
    secao.estado.set('editando');

    this.desfazerService.oferecer({
      mensagem: `Seção "${ROTULO_SECAO_ANOTACAO[secao.tipo]}" limpa`,
      duracaoMs: JANELA_LIMPAR_MS,
      mensagemAposDesfazer: '',
      desfazer: () => of(null),
      aposDesfazer: () => this.restaurarAposLimpar(secao),
      aoEncerrar: () => this.gravarLimpeza(secao),
    });
  }

  /** Move o trecho do menu para o fim de `destino`; salva as duas seções antes, para enviar o que o usuário vê. */
  private enviarTrecho(destino: TipoAnotacaoEnum): void {
    const alvo = this.trechoDoMenu;
    const secaoDestino = this.secoes().find((secao) => secao.tipo === destino);
    if (!alvo || !secaoDestino || alvo.secao === secaoDestino) return;
    const { secao: secaoOrigem, texto } = alvo;

    this.executarMover(secaoOrigem, secaoDestino, texto).subscribe((movido) => {
      if (!movido) return;
      if (!this.secoesAbertas().includes(destino)) this.secoesAbertas.update((abertas) => [...abertas, destino]);
      this.desfazerService.oferecer({
        mensagem: `Enviado para ${ROTULO_SECAO_ANOTACAO[destino]}`,
        duracaoMs: JANELA_LIMPAR_MS,
        mensagemAposDesfazer: '',
        desfazer: () => this.executarMover(secaoDestino, secaoOrigem, texto),
      });
    });
  }

  /** Salva as duas seções, move o trecho e atualiza as duas na tela. `null` se não moveu (já avisou o usuário). */
  private executarMover(origem: SecaoAnotacao, destino: SecaoAnotacao, trecho: string): Observable<AnotacaoTrechoMovidoDto | null> {
    if (origem.limpando || destino.limpando) this.desfazerService.dispensar();
    return from(Promise.all([this.garantirSalva(origem), this.garantirSalva(destino)])).pipe(
      switchMap(([origemSalva, destinoSalva]) => {
        if (!origemSalva || !destinoSalva) {
          this.avisar('warn', 'Não enviado', 'Não foi possível salvar as seções antes de enviar o trecho.');
          return of(null);
        }
        return this.anotacaoService
          .moverTrecho(origem.usuarioId, {
            tipoOrigem: origem.tipo,
            tipoDestino: destino.tipo,
            trecho,
            updatedDateOrigemLido: origem.versaoLida as Date,
            updatedDateDestinoLido: destino.versaoLida as Date,
          })
          .pipe(
            map((resposta) => resposta.dados ?? null),
            catchError((erro: HttpErrorResponse) => {
              this.recarregarPorFalhaAoMover(origem, destino, erro);
              return of(null);
            }),
          );
      }),
      map((movido) => {
        if (movido) this.aplicarMovimento(origem, destino, movido);
        return movido;
      }),
    );
  }

  private aplicarMovimento(origem: SecaoAnotacao, destino: SecaoAnotacao, movido: AnotacaoTrechoMovidoDto): void {
    const pares: [SecaoAnotacao, AnotacaoResumoDto][] = [[origem, movido.origem], [destino, movido.destino]];
    for (const [secao, lida] of pares) {
      secao.adotar(lida);
      secao.estado.set('salvo');
      secao.salvoEm.set(new Date());
    }
    this.agora.set(new Date());
    if (this.usuarioId() === origem.usuarioId) this.alteracaoData.set(movido.destino.updatedDate);
    this.avisarAlteracao(origem.usuarioId);
  }

  /** Trecho ausente ou repetido (400) ou seção alterada em outro lugar (409): nada foi movido; recarrega as duas. */
  private recarregarPorFalhaAoMover(origem: SecaoAnotacao, destino: SecaoAnotacao, erro: HttpErrorResponse): void {
    if (erro.status !== 400 && erro.status !== 409) {
      this.avisar('error', 'Erro', 'Não foi possível enviar o trecho.');
      return;
    }
    this.anotacaoService.listar(origem.usuarioId, [origem.tipo, destino.tipo]).subscribe({
      next: (resposta) => {
        resposta.dados?.forEach((lida) => [origem, destino].find((secao) => secao.tipo === lida.tipo)?.adotar(lida));
        this.avisarAlteracao(origem.usuarioId);
      },
    });
    this.avisar(
      'warn',
      'Trecho não enviado',
      erro.status === 409
        ? 'As seções mudaram em outro lugar. Mostrando as versões mais recentes; nada foi movido.'
        : 'O trecho não foi encontrado ou aparece mais de uma vez na seção. Nada foi movido.',
    );
  }

  /** Espera o PUT em andamento e salva o que ainda estiver pendente; `true` se a seção ficou igual ao servidor. */
  private async garantirSalva(secao: SecaoAnotacao): Promise<boolean> {
    secao.cancelarAgendamento();
    while (secao.salvamentoAtual) await secao.salvamentoAtual;
    if (secao.textoAtual !== secao.conteudoSalvo) {
      this.salvarAgora(secao);
      while (secao.salvamentoAtual) await secao.salvamentoAtual;
    }
    return secao.textoAtual === secao.conteudoSalvo;
  }

  private avisar(severidade: 'warn' | 'error', titulo: string, detalhe: string): void {
    this.messageService.add({ severity: severidade, summary: titulo, detail: detalhe, life: 8000 });
  }

  private aoDigitar(secao: SecaoAnotacao, conteudo: string): void {
    if (secao.limpando) {
      // Digitar na janela do Desfazer é aceitar a limpeza e continuar escrevendo.
      secao.conteudoAntesDeLimpar = null;
      this.desfazerService.dispensarSemEncerrar();
    }
    secao.temTexto.set(anotacaoTemTexto(conteudo));
    secao.cancelarAgendamento();
    if (conteudo === secao.conteudoSalvo) {
      secao.estado.set(secao.salvoEm() ? 'salvo' : 'ocioso');
      return;
    }
    secao.estado.set('editando');
    secao.temporizadorSalvar = setTimeout(() => this.salvarAgora(secao), ESPERA_AUTO_SAVE_MS);
  }

  /** PUT imediato do que mudou; sem mudança real, não sai requisição. `aoFechar` oferece "Reabrir" se falhar. */
  private salvarAgora(secao: SecaoAnotacao, aoFechar = false): void {
    secao.cancelarAgendamento();
    const enviado = secao.textoAtual;
    if (enviado === secao.conteudoSalvo) return;
    if (secao.salvandoRequisicao) {
      secao.salvarDeNovo = true;
      return;
    }

    secao.salvandoRequisicao = true;
    let concluir: () => void = () => {};
    secao.salvamentoAtual = new Promise<void>((resolve) => (concluir = resolve));
    secao.estado.set('salvando');
    this.anotacaoService
      .alterar(secao.usuarioId, secao.tipo, { texto: enviado, updatedDateLido: secao.versaoLida as Date })
      .pipe(finalize(() => {
        secao.salvandoRequisicao = false;
        secao.salvamentoAtual = null;
        concluir();
        if (secao.salvarDeNovo) {
          secao.salvarDeNovo = false;
          this.salvarAgora(secao, aoFechar);
        }
      }))
      .subscribe({
        next: (resposta) => {
          secao.conteudoSalvo = enviado;
          secao.versaoLida = resposta.dados?.updatedDate ?? secao.versaoLida;
          secao.salvoEm.set(new Date());
          this.agora.set(new Date());
          if (this.usuarioId() === secao.usuarioId) this.alteracaoData.set(secao.versaoLida);
          secao.estado.set(secao.textoAtual === enviado ? 'salvo' : 'editando');
          this.avisarAlteracao(secao.usuarioId);
        },
        error: (erro: HttpErrorResponse) => {
          secao.salvarDeNovo = false;
          if (erro.status === 409) {
            this.recarregarPorConflito(secao);
            return;
          }
          secao.estado.set('erro');
          if (aoFechar && !this.visivel()) this.oferecerReabrir(secao, enviado);
        },
      });
  }

  /** O servidor tem uma versão mais nova da seção: mostra essa, descarta o texto local e avisa. */
  private recarregarPorConflito(secao: SecaoAnotacao): void {
    this.anotacaoService.listar(secao.usuarioId, [secao.tipo]).subscribe({
      next: (resposta) => {
        const lida = resposta.dados?.[0];
        if (!lida) {
          secao.estado.set('erro');
          return;
        }
        secao.cancelarAgendamento();
        secao.adotar(lida);
        secao.estado.set('ocioso');
        this.messageService.add({
          severity: 'warn',
          summary: 'Seção atualizada',
          detail: `"${ROTULO_SECAO_ANOTACAO[secao.tipo]}" mudou em outro lugar. Mostrando a versão mais recente; o que você digitou nela não foi salvo.`,
          life: 8000,
        });
        this.avisarAlteracao(secao.usuarioId);
      },
      error: () => secao.estado.set('erro'),
    });
  }

  private oferecerReabrir(secao: SecaoAnotacao, conteudo: string): void {
    this.desfazerService.oferecer({
      mensagem: `Não foi possível salvar "${ROTULO_SECAO_ANOTACAO[secao.tipo]}"`,
      rotulo: 'Reabrir',
      mensagemAposDesfazer: '',
      desfazer: () => of(null),
      aposDesfazer: () => {
        // Se o drawer já foi para o pad de outra pessoa, a seção não está mais na tela.
        if (this.usuarioId() !== secao.usuarioId || !this.secoes().includes(secao)) return;
        this.visivel.set(true);
        this.iniciarRelogio();
        if (!this.secoesAbertas().includes(secao.tipo)) this.secoesAbertas.update((abertas) => [...abertas, secao.tipo]);
        secao.controle.setValue(conteudo);
      },
    });
  }

  private restaurarAposLimpar(secao: SecaoAnotacao): void {
    const anterior = secao.conteudoAntesDeLimpar;
    secao.conteudoAntesDeLimpar = null;
    if (anterior === null) return;
    secao.controle.setValue(anterior, { emitEvent: false });
    this.aoDigitar(secao, anterior);
  }

  /** A janela do Desfazer acabou: grava o vazio (a seção sabe de quem é). */
  private gravarLimpeza(secao: SecaoAnotacao): void {
    if (!secao.limpando) return;
    secao.conteudoAntesDeLimpar = null;
    secao.controle.setValue('', { emitEvent: false });
    this.salvarAgora(secao);
  }

  /**
   * Grava o que estiver pendente. Fechar o drawer deixa uma limpeza em andamento terminar sozinha (a janela
   * do Desfazer segue); trocar de pessoa ou destruir o componente a confirma na hora (`dispensarLimpeza`).
   */
  private descarregar(opcoes: { aoFechar?: boolean; dispensarLimpeza?: boolean }): void {
    const secoes = this.secoes();
    if (opcoes.dispensarLimpeza && secoes.some((secao) => secao.limpando)) this.desfazerService.dispensar();
    secoes.forEach((secao) => {
      if (!secao.limpando) this.salvarAgora(secao, opcoes.aoFechar);
    });
  }

  /** Avisa a listagem se o pad inteiro tem ou não texto (conforme o que está salvo). */
  private avisarAlteracao(usuarioId: number): void {
    if (this.usuarioId() !== usuarioId) return;
    const temAnotacoes = this.secoes().some((secao) => anotacaoTemTexto(secao.conteudoSalvo));
    this.aoAlterar.emit({ usuarioId, temAnotacoes });
  }

  private carregar(usuarioId: number): void {
    this.carregando.set(true);
    this.alteracaoData.set(null);
    const precisaDoNome = !this.nomeCompleto();
    forkJoin({
      secoes: this.anotacaoService.listar(usuarioId),
      usuario: precisaDoNome ? this.usuarioService.recuperar(usuarioId).pipe(catchError(() => of(null))) : of(null),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ secoes, usuario }) => {
          if (!secoes.sucesso || !secoes.dados || this.usuarioId() !== usuarioId) return;
          if (precisaDoNome && usuario?.dados) this.nomeCompleto.set(usuario.dados.nomeCompleto);

          this.secoes().forEach((anterior) => anterior.encerrar());
          const novas = secoes.dados.map((lida) => {
            const secao = new SecaoAnotacao(usuarioId, lida.tipo, lida);
            secao.assinatura = secao.controle.valueChanges.subscribe((conteudo) => this.aoDigitar(secao, conteudo));
            return secao;
          });
          this.secoes.set(novas);
          this.secoesAbertas.set(SECOES_ABERTAS_AO_ABRIR);
          const comTexto = novas.filter((secao) => anotacaoTemTexto(secao.conteudoSalvo)).map((secao) => secao.versaoLida);
          this.alteracaoData.set(comTexto.length ? comTexto.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : null);
          // Os editores só existem depois que o esqueleto some: foca no ciclo seguinte.
          setTimeout(() => this.editores()[0]?.focar());
        },
        error: () => {
          this.visivel.set(false);
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar as anotações.' });
        },
      });
  }

  private iniciarRelogio(): void {
    this.agora.set(new Date());
    this.pararRelogio();
    this.temporizadorRelogio = setInterval(() => this.agora.set(new Date()), 30000);
  }

  private pararRelogio(): void {
    if (this.temporizadorRelogio !== null) clearInterval(this.temporizadorRelogio);
    this.temporizadorRelogio = null;
  }
}
