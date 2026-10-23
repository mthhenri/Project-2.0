import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { LIMITE_TEXTO_MENSAGEM_DIRETA, MensagemDiretaReferenciaResumoDto, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import {
  PessoaEscolhida,
  ReferenciaEscolhida,
  ROTULO_DO_TIPO_DE_REFERENCIA,
  aplicarEscolha,
  detectarGatilho,
  inserirBlocoDeCodigo,
  mencoesPresentes,
  pareceCodigo,
  referenciasPresentes,
  rotuloDaSituacao,
} from '../../utils/compositor.util';
import { filtrarPessoasPorNome } from '../../utils/mensagem-direta.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';
import { CodigoEscolhido, MensagemDiretaCodigoPainelComponent } from '../mensagem-direta-codigo-painel/mensagem-direta-codigo-painel.component';

const ATRASO_DA_BUSCA_MS = 250;
const MINIMO_DE_LETRAS_DA_REFERENCIA = 2;

interface ItemDaSugestao {
  /** O texto que entra na mensagem depois do `@` ou `#`. */
  rotulo: string;
  titulo: string;
  detalhe: string;
  icone: string | null;
  /** Para a pessoa: o nome do avatar. */
  nomeDoAvatar: string | null;
  /** O que o item representa: a pessoa (do `@`) ou a demanda/atividade (do `#`). Quem escolhe usa isto, não o rótulo (dois itens podem ter o mesmo nome). */
  pessoa: PessoaEscolhida | null;
  referencia: MensagemDiretaReferenciaResumoDto | null;
}

type SituacaoDaBusca = 'ocioso' | 'carregando' | 'pronto' | 'erro';

/**
 * O campo de mensagem do popup (task 211): `Enter` envia e `Shift+Enter` quebra a linha, botão e colagem de **código**, e sugestões ao digitar `@`
 * (as pessoas da conversa) e `#` (demandas e atividades que o usuário pode referenciar). No envio só vão as menções e referências cujo texto ainda
 * está na mensagem. O texto continua sendo Markdown puro; o servidor calcula `contemCodigo`.
 */
@Component({
  selector: 'app-mensagem-direta-compositor',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, TextareaModule, TooltipModule, MensagemDiretaAvatarComponent, MensagemDiretaCodigoPainelComponent],
  templateUrl: './mensagem-direta-compositor.component.html',
  styleUrl: './mensagem-direta-compositor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaCompositorComponent {
  private readonly api = inject(MensagemDiretaService);
  private readonly detectorDeMudancas = inject(ChangeDetectorRef);
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campoTexto');

  /** Quem pode ser mencionado: só os participantes da conversa (a regra do servidor). */
  readonly pessoas = input.required<PessoaEscolhida[]>();
  /** Muda ao abrir outra conversa: o campo recebe o foco (depois disso o foco é de quem usa a página, o popup não é modal). */
  readonly chave = input<number | null>(null);
  readonly enviar = output<EnvioDoCompositor>();
  /** Código a pôr no campo como bloco (o que o usuário copiou antes do atalho do Desktop, task 213); `textoAplicado` avisa que já foi usado. */
  readonly codigoInicial = input<string | null>(null);
  readonly textoAplicado = output<void>();

  protected readonly limiteDoTexto = LIMITE_TEXTO_MENSAGEM_DIRETA;
  readonly controleTexto = new FormControl('', { nonNullable: true });
  protected readonly texto = signal('');
  /** O painel do mini editor de código (task 216), aberto pelo botão `</>`: guarda o trecho do campo que o bloco vai substituir. `null` = fechado. */
  protected readonly painelDeCodigo = signal<{ inicio: number; fim: number; selecionado: string } | null>(null);
  private readonly cursor = signal(0);
  /** O `inicio` do gatilho que o usuário dispensou com Esc ou clicando fora: ele não reabre até o texto passar a ter OUTRO gatilho (ou nenhum). */
  private readonly dispensadoEm = signal<number | null>(null);
  /**
   * O item que acabou de ser escolhido (`@Nome` ou `#Nome` já no texto): enquanto ele continua lá, continuar a frase depois dele não reabre a lista
   * ("#Corrigir filtro está pronto" não é uma busca por "Corrigir filtro está pronto").
   */
  private readonly escolhido = signal<{ inicio: number; marcador: string } | null>(null);

  protected readonly podeEnviar = computed(() => this.texto().trim().length > 0 && this.texto().length <= LIMITE_TEXTO_MENSAGEM_DIRETA);

  protected readonly gatilho = computed(() => {
    const texto = this.texto();
    const gatilho = detectarGatilho(texto, this.cursor());
    if (!gatilho || gatilho.inicio === this.dispensadoEm()) return null;
    const escolhido = this.escolhido();
    if (escolhido && gatilho.inicio === escolhido.inicio && texto.startsWith(escolhido.marcador, escolhido.inicio)) return null;
    return gatilho;
  });

  protected readonly situacaoDaBusca = signal<SituacaoDaBusca>('ocioso');
  private readonly achadas = signal<MensagemDiretaReferenciaResumoDto[]>([]);

  protected readonly itens = computed<ItemDaSugestao[]>(() => {
    const gatilho = this.gatilho();
    if (!gatilho) return [];
    if (gatilho.tipo === 'MENCAO') {
      return filtrarPessoasPorNome(
        this.pessoas().map((pessoa) => ({ ...pessoa, usuarioNome: pessoa.nome })),
        gatilho.termo,
      ).map((pessoa) => ({
        rotulo: pessoa.nome, titulo: pessoa.nome, detalhe: '', icone: null, nomeDoAvatar: pessoa.nome,
        pessoa: { usuarioId: pessoa.usuarioId, nome: pessoa.nome }, referencia: null,
      }));
    }
    return this.achadas().map((referencia) => ({
      rotulo: referencia.nome,
      titulo: referencia.nome,
      detalhe:
        referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA
          ? `${ROTULO_DO_TIPO_DE_REFERENCIA[referencia.tipo]} · ${rotuloDaSituacao(referencia.situacao)}`
          : `${ROTULO_DO_TIPO_DE_REFERENCIA[referencia.tipo]} · ${referencia.demandaNome ?? ''}`,
      icone: referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA ? 'pi-sitemap' : 'pi-check-square',
      nomeDoAvatar: null,
      pessoa: null,
      referencia,
    }));
  });

  /** A lista fica aberta com `@` (sempre que há gatilho) e com `#` assim que há texto suficiente para buscar. */
  protected readonly listaAberta = computed(() => {
    const gatilho = this.gatilho();
    if (!gatilho) return false;
    if (gatilho.tipo === 'MENCAO') return this.itens().length > 0 || !gatilho.termo.includes(' ');
    return gatilho.termo.trim().length >= MINIMO_DE_LETRAS_DA_REFERENCIA;
  });
  protected readonly indice = signal(0);
  protected readonly cabecalhoDaLista = computed(() => (this.gatilho()?.tipo === 'MENCAO' ? 'Mencionar' : 'Referenciar'));

  private escolhidasPessoas: PessoaEscolhida[] = [];
  private escolhidasReferencias: ReferenciaEscolhida[] = [];
  private geracaoDaBusca = 0;
  /** Posição do espaço que a escolha de uma sugestão acrescentou: uma pontuação digitada logo depois o consome ("@Nome, que acha?" e não "@Nome , que acha?"). */
  private espacoAutomaticoEm: number | null = null;
  private temporizadorDaBusca: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorDaBusca) clearTimeout(this.temporizadorDaBusca);
    });
    this.controleTexto.valueChanges.subscribe((valor) => this.texto.set(valor));

    effect(() => {
      if (this.chave() !== null && this.campo()) setTimeout(() => this.campo()?.nativeElement.focus(), 0);
    });

    // O código do Desktop entra uma vez como bloco, com o cursor depois dele; o usuário confere e envia (nada é enviado sozinho).
    effect(() => {
      const codigo = this.codigoInicial();
      const campo = this.campo()?.nativeElement;
      if (codigo === null || !campo) return;
      untracked(() => {
        const resultado = inserirBlocoDeCodigo(campo.value, campo.value.length, campo.value.length, codigo);
        if (resultado.texto.length <= LIMITE_TEXTO_MENSAGEM_DIRETA) {
          this.controleTexto.setValue(resultado.texto);
          setTimeout(() => {
            campo.focus();
            campo.setSelectionRange(resultado.cursor, resultado.fimDaSelecao);
            this.atualizarCursor();
          }, 0);
        }
        this.textoAplicado.emit();
      });
    });

    // O gatilho que o usuário dispensou (Esc, clique fora ou item já escolhido) volta a valer quando o texto passa a ter OUTRO gatilho (ou nenhum).
    effect(() => {
      const bruto = detectarGatilho(this.texto(), this.cursor());
      const dispensado = untracked(() => this.dispensadoEm());
      if (dispensado !== null && (!bruto || bruto.inicio !== dispensado)) this.dispensadoEm.set(null);
      // O item escolhido deixa de valer quando o usuário o apaga ou o altera.
      const escolhido = untracked(() => this.escolhido());
      if (escolhido && !this.texto().startsWith(escolhido.marcador, escolhido.inicio)) this.escolhido.set(null);
    });

    // A busca do `#`: espera uma pausa na digitação. Toda mudança do termo invalida a busca anterior e limpa as sugestões (nada de resposta atrasada
    // nem de item de uma busca antiga que o Enter possa escolher).
    effect(() => {
      const gatilho = this.gatilho();
      this.indice.set(0);
      this.geracaoDaBusca++;
      this.achadas.set([]);
      if (this.temporizadorDaBusca) clearTimeout(this.temporizadorDaBusca);
      this.temporizadorDaBusca = null;
      if (!gatilho || gatilho.tipo !== 'REFERENCIA' || gatilho.termo.trim().length < MINIMO_DE_LETRAS_DA_REFERENCIA) {
        this.situacaoDaBusca.set('ocioso');
        return;
      }
      const termo = gatilho.termo.trim();
      this.situacaoDaBusca.set('carregando');
      this.temporizadorDaBusca = setTimeout(() => void this.buscarReferencias(termo, gatilho.inicio), ATRASO_DA_BUSCA_MS);
    });

    // A opção destacada pelas setas precisa estar à vista (a lista rola).
    effect(() => {
      const posicao = this.indice();
      if (this.listaAberta()) setTimeout(() => document.getElementById(`sugestao-${posicao}`)?.scrollIntoView?.({ block: 'nearest' }), 0);
    });
  }

  private async buscarReferencias(termo: string, inicioDoGatilho: number): Promise<void> {
    const geracao = this.geracaoDaBusca;
    try {
      const resposta = await firstValueFrom(this.api.buscarReferencias(termo));
      if (geracao !== this.geracaoDaBusca) return;
      const referencias = resposta.dados?.referencias ?? [];
      this.achadas.set(referencias);
      this.situacaoDaBusca.set('pronto');
      // `#` com espaço no meio e nenhum resultado é texto comum ("o PR #12 quebrou a build"): a lista fecha e não reabre neste gatilho.
      if (referencias.length === 0 && termo.includes(' ')) this.dispensadoEm.set(inicioDoGatilho);
    } catch {
      if (geracao !== this.geracaoDaBusca) return;
      this.achadas.set([]);
      this.situacaoDaBusca.set('erro');
    }
  }

  // ---------------------------------------------------------------------------
  // Teclado, cursor e colagem
  // ---------------------------------------------------------------------------

  protected aoDigitar(): void {
    this.atualizarCursor();
  }

  /** Clicar fora do campo (que não seja numa sugestão: o `mousedown` delas não tira o foco) fecha a lista. */
  protected aoPerderOFoco(): void {
    const gatilho = this.gatilho();
    if (gatilho) this.dispensadoEm.set(gatilho.inicio);
  }

  protected atualizarCursor(): void {
    const campo = this.campo()?.nativeElement;
    if (campo) this.cursor.set(campo.selectionStart ?? campo.value.length);
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.isComposing) return;
    if (this.listaAberta() && this.itens().length > 0) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        const total = this.itens().length;
        this.indice.update((atual) => (evento.key === 'ArrowDown' ? (atual + 1) % total : (atual - 1 + total) % total));
        return;
      }
      if ((evento.key === 'Enter' && !evento.shiftKey) || evento.key === 'Tab') {
        evento.preventDefault();
        this.escolher(this.indice());
        return;
      }
    }
    if (evento.key === 'Escape' && this.listaAberta()) {
      // Fecha só a lista visível: o Esc do popup (que o oculta) não deve disparar junto. Sem lista, o Esc segue para o popup.
      evento.preventDefault();
      evento.stopPropagation();
      this.dispensadoEm.set(this.gatilho()!.inicio);
      return;
    }
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviarMensagem();
      return;
    }
    this.consumirEspacoAutomatico(evento);
  }

  private consumirEspacoAutomatico(evento: KeyboardEvent): void {
    const campo = this.campo()?.nativeElement;
    const posicao = this.espacoAutomaticoEm;
    if (!campo || posicao === null) return;
    const cursorLogoDepois = campo.selectionStart === posicao + 1 && campo.selectionEnd === posicao + 1 && campo.value[posicao] === ' ';
    if (cursorLogoDepois && /^[,.;:!?)]$/.test(evento.key)) {
      campo.setRangeText('', posicao, posicao + 1, 'end');
      this.controleTexto.setValue(campo.value);
    }
    // Qualquer tecla que não seja a pontuação logo depois da escolha encerra a janela do espaço automático.
    this.espacoAutomaticoEm = null;
  }

  protected aoColar(evento: ClipboardEvent): void {
    const colado = evento.clipboardData?.getData('text') ?? '';
    if (!pareceCodigo(colado)) return;
    const campo = evento.target as HTMLTextAreaElement;
    // Perto do limite de 10.000 caracteres a cerca não cabe: a colagem segue o caminho nativo (que o `maxlength` já limita).
    if (!this.caberiaOBloco(campo, colado)) return;
    evento.preventDefault();
    this.aplicarBloco(campo, colado);
  }

  private caberiaOBloco(campo: HTMLTextAreaElement, conteudo: string): boolean {
    const resultado = inserirBlocoDeCodigo(campo.value, campo.selectionStart, campo.selectionEnd, conteudo);
    return resultado.texto.length <= LIMITE_TEXTO_MENSAGEM_DIRETA;
  }

  /** O botão `</>` abre o mini editor; o trecho selecionado no campo (se houver) já vem nele. */
  protected inserirCodigo(): void {
    const campo = this.campo()?.nativeElement;
    if (!campo) return;
    const { selectionStart: inicio, selectionEnd: fim } = campo;
    this.painelDeCodigo.set({ inicio, fim, selecionado: campo.value.slice(inicio, fim) });
  }

  /** Fecha o painel e já atualiza a tela: com o painel aberto o campo está `inert`, e só depois disso ele aceita o foco de volta. */
  private fecharPainel(): void {
    this.painelDeCodigo.set(null);
    this.detectorDeMudancas.detectChanges();
  }

  protected fecharPainelDeCodigo(): void {
    this.fecharPainel();
    this.campo()?.nativeElement.focus();
  }

  /** O código do mini editor entra no lugar do trecho que estava selecionado quando o painel abriu, já com a linguagem na cerca. */
  protected inserirDoPainel(escolhido: CodigoEscolhido): void {
    const campo = this.campo()?.nativeElement;
    const painel = this.painelDeCodigo();
    this.fecharPainel();
    if (!campo || !painel) return;
    campo.setSelectionRange(painel.inicio, painel.fim);
    this.aplicarBloco(campo, escolhido.codigo, escolhido.linguagem);
  }

  /** Troca a seleção por um bloco de código. Usa `insertText` quando o navegador deixa (o Ctrl+Z desfaz) e `setRangeText` quando não. */
  private aplicarBloco(campo: HTMLTextAreaElement, conteudo: string, linguagem?: string | null): void {
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    const resultado = inserirBlocoDeCodigo(campo.value, inicio, fim, conteudo, linguagem);
    const inserido = resultado.texto.slice(inicio, resultado.texto.length - (campo.value.length - fim));
    campo.focus();
    const desfazivel = typeof document.execCommand === 'function' && document.execCommand('insertText', false, inserido);
    if (!desfazivel) {
      campo.setRangeText(inserido, inicio, fim, 'end');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
    campo.setSelectionRange(resultado.cursor, resultado.fimDaSelecao);
    this.controleTexto.setValue(campo.value);
    this.atualizarCursor();
  }

  // ---------------------------------------------------------------------------
  // Sugestões e envio
  // ---------------------------------------------------------------------------

  protected escolher(posicao: number): void {
    const gatilho = this.gatilho();
    const item = this.itens()[posicao];
    const campo = this.campo()?.nativeElement;
    if (!gatilho || !item || !campo) return;

    const resultado = aplicarEscolha(campo.value, gatilho, campo.selectionStart ?? campo.value.length, item.rotulo);
    const { pessoa, referencia } = item;
    if (pessoa) {
      this.escolhidasPessoas = [...this.escolhidasPessoas.filter((escolhida) => escolhida.usuarioId !== pessoa.usuarioId), pessoa];
    }
    if (referencia) {
      this.escolhidasReferencias = [
        ...this.escolhidasReferencias.filter((escolhida) => !(escolhida.tipo === referencia.tipo && escolhida.id === referencia.id)),
        { tipo: referencia.tipo, id: referencia.id, nome: referencia.nome },
      ];
    }
    campo.value = resultado.texto;
    campo.setSelectionRange(resultado.cursor, resultado.cursor);
    this.controleTexto.setValue(resultado.texto);
    this.cursor.set(resultado.cursor);
    this.dispensadoEm.set(null);
    this.escolhido.set({ inicio: gatilho.inicio, marcador: `${gatilho.tipo === 'MENCAO' ? '@' : '#'}${item.rotulo}` });
    this.espacoAutomaticoEm = resultado.espacoAcrescentado ? resultado.cursor - 1 : null;
    campo.focus();
  }

  /** Escolher com o mouse não pode tirar o foco do campo (o `mousedown` do item é cancelado). */
  protected manterFoco(evento: MouseEvent): void {
    evento.preventDefault();
  }

  protected enviarMensagem(): void {
    if (!this.podeEnviar()) return;
    const texto = this.controleTexto.value;
    this.enviar.emit({
      texto,
      mencoes: mencoesPresentes(texto, this.escolhidasPessoas),
      referencias: referenciasPresentes(texto, this.escolhidasReferencias),
    });
    this.controleTexto.setValue('');
    this.cursor.set(0);
    this.dispensadoEm.set(null);
    this.escolhido.set(null);
    this.escolhidasPessoas = [];
    this.escolhidasReferencias = [];
  }
}
