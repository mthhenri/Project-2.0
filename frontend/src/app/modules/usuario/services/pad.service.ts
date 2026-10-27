import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AnotacaoResumoDto, AnotacaoTrechoMovidoDto, TipoAnotacaoEnum } from '@project20/shared';
import { DesfazerService } from '../../../core/services/desfazer.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { EstadoSalvamento, SecaoAnotacao } from '../components/usuario-anotacoes-dialog/secao-anotacao';
import { anotacaoTemTexto, contarItensEmAberto, ROTULO_SECAO_ANOTACAO, tempoDecorrido } from '../utils/anotacoes.util';
import { AnotacaoService } from './anotacao.service';
import { UsuarioService } from './usuario.service';

/** Quanto tempo sem digitar até o salvamento automático. */
const ESPERA_AUTO_SAVE_MS = 2000;
/** Janela do "Desfazer" do Limpar: o vazio só é gravado depois dela. */
const JANELA_LIMPAR_MS = 7000;
/** Seções abertas quando o pad abre, se o lugar que o mostra não pedir outras. */
export const SECOES_ABERTAS_PADRAO: TipoAnotacaoEnum[] = [TipoAnotacaoEnum.EM_ANDAMENTO];
/** Pior estado primeiro: é o que o rodapé mostra quando as seções divergem. */
const PRIORIDADE_ESTADO: EstadoSalvamento[] = ['erro', 'salvando', 'editando', 'salvo', 'ocioso'];

export interface AnotacoesAlteradasEvento {
  usuarioId: number;
  temAnotacoes: boolean;
}

/**
 * O estado do pad do usuário, **um só** para todo lugar que o mostra (o drawer da barra superior, a aba do chat e a tela de Documentações,
 * tasks 256, 257 e 259): as cinco seções com o editor de cada uma, o salvamento automático, o conflito de versão, o "Limpar" reversível e o
 * "Enviar para". Cada seção salva sozinha: cada mudança agenda um PUT 2 s depois, fechar descarrega na hora e nenhuma requisição sai sem
 * mudança real. O PUT leva a versão lida; se ela mudou em outro lugar (IA, outra aba) o servidor responde 409 e a seção é recarregada com um aviso.
 */
@Injectable({ providedIn: 'root' })
export class PadService implements OnDestroy {
  private readonly anotacaoService = inject(AnotacaoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly messageService = inject(MessageService);

  readonly carregando = signal(false);
  readonly secoes = signal<SecaoAnotacao[]>([]);
  readonly secoesAbertas = signal<TipoAnotacaoEnum[]>(SECOES_ABERTAS_PADRAO);
  readonly alteracaoData = signal<Date | string | null>(null);
  /** Itens de tarefa em aberto nas Pendências (o número da aba Anotações do chat); acompanha o que está digitado. */
  readonly pendenciasEmAberto = signal(0);
  private readonly agora = signal(new Date());
  private readonly usuarioId = signal(0);
  private readonly nomeCompleto = signal('');
  private secoesAbertasAoAbrir: TipoAnotacaoEnum[] = SECOES_ABERTAS_PADRAO;
  private temporizadorRelogio: ReturnType<typeof setInterval> | null = null;
  private readonly ouvintes = new Set<(evento: AnotacoesAlteradasEvento) => void>();
  private reabrir: (() => void) | null = null;
  private aoFalharAoCarregar: (() => void) | null = null;

  readonly titulo = computed(() => (this.sessao.id() === this.usuarioId() ? 'Minhas anotações' : `Anotações de ${this.nomeCompleto()}`));

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

  /** O app (ou o teste) acabou: só desarma os temporizadores. Gravar o que sobrou é de quem mostra o pad, enquanto o injetor ainda vive. */
  ngOnDestroy(): void {
    this.pararRelogio();
    this.secoes().forEach((secao) => {
      secao.cancelarAgendamento();
      secao.encerrar();
    });
  }

  /** Quem quer saber quando um salvamento muda se o pad tem texto (a listagem atualiza o ícone). Devolve o cancelamento. */
  observarAlteracoes(ouvinte: (evento: AnotacoesAlteradasEvento) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  /** Carrega o pad do usuário informado; sem `nomeCompleto`, usa o devolvido pela API. `aoReabrir` mostra o pad de novo (o "Reabrir" de um erro ao fechar) e `aoFalhar` o esconde se não foi possível carregar. */
  abrir(usuarioId: number, nomeCompleto = '', opcoes: { secoesAbertas?: TipoAnotacaoEnum[]; aoReabrir?: () => void; aoFalhar?: () => void } = {}): void {
    if (this.usuarioId() !== usuarioId) this.descarregar({ dispensarLimpeza: true });
    this.usuarioId.set(usuarioId);
    this.nomeCompleto.set(nomeCompleto);
    this.secoesAbertasAoAbrir = opcoes.secoesAbertas ?? SECOES_ABERTAS_PADRAO;
    this.reabrir = opcoes.aoReabrir ?? null;
    this.aoFalharAoCarregar = opcoes.aoFalhar ?? null;
    // O mesmo pad já na tela com texto ainda sem gravar (o drawer abriu sobre a aba do chat): reler do servidor perderia o que foi digitado.
    if (!this.temMudancaSemGravar(usuarioId)) this.carregar(usuarioId);
    this.iniciarRelogio();
  }

  /**
   * Garante o pad da pessoa carregado para quem o mostra de forma permanente (a aba Anotações do chat, task 257): carrega na primeira vez e, nas
   * seguintes, só se for outra pessoa. O estado é o mesmo do drawer, então o que foi editado num lugar já está no outro.
   */
  garantirCarregado(usuarioId: number, nomeCompleto: string): void {
    if (this.usuarioId() === usuarioId && (this.secoes().length > 0 || this.carregando())) return;
    this.usuarioId.set(usuarioId);
    this.nomeCompleto.set(nomeCompleto);
    this.carregar(usuarioId);
  }

  private temMudancaSemGravar(usuarioId: number): boolean {
    return this.usuarioId() === usuarioId && this.secoes().some((secao) => secao.textoAtual !== secao.conteudoSalvo || secao.salvandoRequisicao);
  }

  /** O pad saiu de cena (fechar, Esc ou clique fora): salva sem confirmação. */
  fechar(): void {
    this.pararRelogio();
    this.descarregar({ aoFechar: true });
  }

  /** O lugar que mostrava o pad foi destruído: nada digitado ou limpo pode ficar para trás. */
  encerrar(): void {
    this.pararRelogio();
    this.descarregar({ dispensarLimpeza: true });
    this.secoes().forEach((secao) => secao.encerrar());
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

  /** Esvazia a seção e deixa 7 s para desfazer; só depois o vazio é gravado. */
  limpar(secao: SecaoAnotacao): void {
    const anterior = secao.textoAtual;
    if (!anotacaoTemTexto(anterior) || secao.limpando) return;

    secao.cancelarAgendamento();
    secao.conteudoAntesDeLimpar = anterior;
    secao.controle.setValue('', { emitEvent: false });
    secao.temTexto.set(false);
    this.recalcularPendencias();
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

  /** Move o trecho para o fim de `destino`; salva as duas seções antes, para enviar o que o usuário vê. */
  enviarTrecho(origem: SecaoAnotacao, destino: TipoAnotacaoEnum, texto: string): void {
    const secaoDestino = this.secoes().find((secao) => secao.tipo === destino);
    if (!secaoDestino || origem === secaoDestino) return;

    this.executarMover(origem, secaoDestino, texto).subscribe((movido) => {
      if (!movido) return;
      if (!this.secoesAbertas().includes(destino)) this.secoesAbertas.update((abertas) => [...abertas, destino]);
      this.desfazerService.oferecer({
        mensagem: `Enviado para ${ROTULO_SECAO_ANOTACAO[destino]}`,
        duracaoMs: JANELA_LIMPAR_MS,
        mensagemAposDesfazer: '',
        desfazer: () => this.executarMover(secaoDestino, origem, texto),
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
    this.recalcularPendencias();
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
          if (aoFechar) this.oferecerReabrir(secao, enviado);
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
        // Se o pad já foi para o de outra pessoa, a seção não está mais na tela.
        if (this.usuarioId() !== secao.usuarioId || !this.secoes().includes(secao)) return;
        this.reabrir?.();
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
   * Grava o que estiver pendente. Fechar o pad deixa uma limpeza em andamento terminar sozinha (a janela
   * do Desfazer segue); trocar de pessoa ou encerrar a confirma na hora (`dispensarLimpeza`).
   */
  private descarregar(opcoes: { aoFechar?: boolean; dispensarLimpeza?: boolean }): void {
    const secoes = this.secoes();
    if (opcoes.dispensarLimpeza && secoes.some((secao) => secao.limpando)) this.desfazerService.dispensar();
    secoes.forEach((secao) => {
      if (!secao.limpando) this.salvarAgora(secao, opcoes.aoFechar);
    });
  }

  private recalcularPendencias(): void {
    const pendencias = this.secoes().find((secao) => secao.tipo === TipoAnotacaoEnum.PENDENCIA);
    this.pendenciasEmAberto.set(pendencias ? contarItensEmAberto(pendencias.textoAtual) : 0);
  }

  /** Avisa quem observa se o pad inteiro tem ou não texto (conforme o que está salvo). */
  private avisarAlteracao(usuarioId: number): void {
    if (this.usuarioId() !== usuarioId) return;
    this.recalcularPendencias();
    const temAnotacoes = this.secoes().some((secao) => anotacaoTemTexto(secao.conteudoSalvo));
    this.ouvintes.forEach((ouvinte) => ouvinte({ usuarioId, temAnotacoes }));
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
          this.secoesAbertas.set(this.secoesAbertasAoAbrir);
          this.recalcularPendencias();
          const comTexto = novas.filter((secao) => anotacaoTemTexto(secao.conteudoSalvo)).map((secao) => secao.versaoLida);
          this.alteracaoData.set(comTexto.length ? comTexto.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : null);
        },
        error: () => {
          this.aoFalharAoCarregar?.();
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
