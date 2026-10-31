import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize, startWith } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { TagResumoDto, TagAlteradaDto, REGEX_SEM_CARACTERES_PROIBIDOS, MENSAGEM_CARACTERES_PROIBIDOS } from '@project20/shared';
import { TagService } from '../../services/tag.service';
import { compararTagsPorNome, estiloPillTag, nomeDeTagContem, nomeDeTagIgual } from '../../utils/tag.util';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { CORES_PREDEFINIDAS, SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';

/** Alvo do popover de paleta: a cor da próxima tag do quick-add ou a cor de uma tag existente. */
type AlvoPaleta = { tipo: 'nova' } | { tipo: 'tag'; tag: TagResumoDto };

@Component({
  selector: 'app-tag-listagem',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PopoverModule,
    TooltipModule,
    SeletorCorComponent,
    SkeletonListaComponent,
    BarraRecargaComponent,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './tag-listagem.page.html',
  styleUrl: './tag-listagem.page.scss',
})
export class TagListagemPage implements OnInit {
  private readonly tagService = inject(TagService);
  private readonly desfazerService = inject(DesfazerService);

  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly campoRapido = viewChild<ElementRef<HTMLInputElement>>('campoRapido');
  private readonly popoverCor = viewChild.required<Popover>('popoverCor');
  private readonly campoNomeEdicao = viewChild<ElementRef<HTMLInputElement>>('campoNomeEdicao');

  readonly tags = signal<TagResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());

  readonly campoBuscaControle = new FormControl('', { nonNullable: true });
  readonly campoRapidoControle = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
  });
  private readonly termoBusca = toSignal(this.campoBuscaControle.valueChanges.pipe(startWith('')), { initialValue: '' });
  private readonly textoRapido = toSignal(this.campoRapidoControle.valueChanges.pipe(startWith('')), { initialValue: '' });

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly estiloPillTag = estiloPillTag;

  /** Cor da próxima tag do quick-add: gira pela paleta a cada criação. */
  private readonly indiceCor = signal<number>(Math.floor(Math.random() * CORES_PREDEFINIDAS.length));
  readonly corNova = computed(() => CORES_PREDEFINIDAS[this.indiceCor() % CORES_PREDEFINIDAS.length]);
  readonly erroRapido = signal<string | null>(null);

  /** Edição do nome na própria linha (task 282): só uma tag por vez; a cor continua no ponto da linha. */
  readonly tagEmEdicaoDeNome = signal<number | null>(null);
  readonly erroNomeEdicao = signal<string | null>(null);
  readonly nomeEdicaoControle = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(100), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
  });

  readonly selecionadas = signal<ReadonlySet<number>>(new Set());
  readonly alvoPaleta = signal<AlvoPaleta | null>(null);
  private corPendentePersonalizada: string | null = null;
  private proximoIdTemporario = -1;

  readonly termo = computed(() => this.termoBusca().trim());
  readonly tagsExibidas = computed(() => {
    const termoAtual = this.termo();
    return termoAtual ? this.tags().filter((tag) => nomeDeTagContem(tag.nome, termoAtual)) : this.tags();
  });

  /** Duplicidade conferida no cliente; a corrida com outro usuário ainda volta como erro do servidor. */
  readonly nomeDuplicado = computed(() => {
    const texto = this.textoRapido().trim();
    return !!texto && this.tags().some((tag) => nomeDeTagIgual(tag.nome, texto));
  });

  readonly corDoPopover = computed(() => {
    const alvo = this.alvoPaleta();
    if (!alvo) return this.corNova();
    return alvo.tipo === 'nova' ? this.corNova() : alvo.tag.cor;
  });

  ngOnInit(): void {
    this.buscarTags();
  }

  /** `/` foca a busca; Esc na busca limpa. */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (evento.key !== '/' || focoEmCampo(evento.target) || haSobreposicaoAberta()) return;
    evento.preventDefault();
    this.campoBusca()?.nativeElement.focus();
  }

  aoEscBusca(evento: Event): void {
    const campo = this.campoBusca()?.nativeElement;
    if (campo?.value) {
      evento.stopPropagation();
      this.campoBuscaControle.setValue('');
    } else {
      campo?.blur();
    }
  }

  buscarTags(): void {
    this.carregando.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.tags.set(resposta.dados);
        },
      });
  }

  /**
   * Quick-add (task 116): a tag aparece na hora com id temporário e é reconciliada com a resposta;
   * se o servidor recusar, o card some e o texto volta ao campo com o motivo. O foco fica no campo.
   */
  adicionar(): void {
    const nome = this.campoRapidoControle.value.trim();
    if (!nome) return;
    if (this.campoRapidoControle.invalid) {
      this.erroRapido.set(this.campoRapidoControle.hasError('maxlength') ? 'Nome deve ter no máximo 100 caracteres' : this.mensagemCaracteresProibidos);
      return;
    }
    if (this.nomeDuplicado()) return;

    const cor = this.corNova();
    const idTemporario = this.proximoIdTemporario--;
    this.erroRapido.set(null);
    this.inserirTag({ id: idTemporario, nome, cor });
    this.campoRapidoControle.setValue('');
    this.indiceCor.update((indice) => indice + 1);
    this.campoRapido()?.nativeElement.focus();

    this.tagService.criar({ nome, cor }, true).subscribe({
      next: (resposta) => {
        const criada = resposta.dados;
        if (!criada) return;
        this.tags.update((lista) => lista.map((item) => (item.id === idTemporario ? { id: criada.id, nome: criada.nome, cor: criada.cor } : item)).sort(compararTagsPorNome));
      },
      error: (erro: HttpErrorResponse) => {
        this.tags.update((lista) => lista.filter((item) => item.id !== idTemporario));
        if (!this.campoRapidoControle.value) this.campoRapidoControle.setValue(nome);
        this.erroRapido.set(erro.error?.erros?.[0] ?? erro.error?.mensagem ?? `Não foi possível criar "${nome}".`);
        this.campoRapido()?.nativeElement.focus();
      },
    });
  }

  aoDigitarRapido(): void {
    this.erroRapido.set(null);
  }

  /** Busca sem resultado: o termo vira o nome da nova tag no quick-add. */
  criarDoTermo(): void {
    const termoAtual = this.termo();
    this.campoBuscaControle.setValue('');
    this.campoRapidoControle.setValue(termoAtual);
    this.campoRapido()?.nativeElement.focus();
  }

  eTemporaria(tag: TagResumoDto): boolean {
    return tag.id < 0;
  }

  /** O nome da linha vira um campo, já selecionado: digitar substitui, Enter confirma, Esc cancela. */
  iniciarEdicaoDoNome(tag: TagResumoDto): void {
    if (this.eTemporaria(tag)) return;
    this.nomeEdicaoControle.setValue(tag.nome);
    this.erroNomeEdicao.set(null);
    this.tagEmEdicaoDeNome.set(tag.id);
    setTimeout(() => this.campoNomeEdicao()?.nativeElement.select());
  }

  cancelarEdicaoDoNome(evento?: Event): void {
    evento?.stopPropagation();
    this.tagEmEdicaoDeNome.set(null);
    this.erroNomeEdicao.set(null);
  }

  /** Sair do campo confirma uma alteração válida; nome igual ou inválido só descarta (o erro aparece no Enter). */
  aoSairDoNome(tag: TagResumoDto): void {
    if (this.tagEmEdicaoDeNome() !== tag.id) return;
    const nome = this.nomeEdicaoControle.value.trim();
    if (!nome || nome === tag.nome || this.nomeEdicaoControle.invalid || this.nomeJaUsadoPorOutra(tag, nome)) {
      this.cancelarEdicaoDoNome();
      return;
    }
    this.salvarNome(tag);
  }

  /** O nome já aparece na lista; se o servidor recusar, volta ao anterior (o aviso vem do toast padrão). */
  salvarNome(tag: TagResumoDto): void {
    if (this.tagEmEdicaoDeNome() !== tag.id) return;
    const nome = this.nomeEdicaoControle.value.trim();
    if (nome === tag.nome) {
      this.cancelarEdicaoDoNome();
      return;
    }
    if (!nome) {
      this.erroNomeEdicao.set('Nome é obrigatório');
      return;
    }
    if (this.nomeEdicaoControle.hasError('maxlength')) {
      this.erroNomeEdicao.set('Nome deve ter no máximo 100 caracteres');
      return;
    }
    if (this.nomeEdicaoControle.hasError('pattern')) {
      this.erroNomeEdicao.set(this.mensagemCaracteresProibidos);
      return;
    }
    if (this.nomeJaUsadoPorOutra(tag, nome)) {
      this.erroNomeEdicao.set('Já existe uma tag com esse nome.');
      return;
    }

    this.cancelarEdicaoDoNome();
    const nomeAnterior = tag.nome;
    this.definirNomeLocal(tag.id, nome);
    this.tagService.alterar(tag.id, { nome }).subscribe({
      next: (resposta) => {
        if (resposta.dados) this.substituirTag(resposta.dados);
      },
      error: () => this.definirNomeLocal(tag.id, nomeAnterior),
    });
  }

  private nomeJaUsadoPorOutra(tag: TagResumoDto, nome: string): boolean {
    return this.tags().some((item) => item.id !== tag.id && nomeDeTagIgual(item.nome, nome));
  }

  private definirNomeLocal(tagId: number, nome: string): void {
    this.tags.update((lista) => lista.map((item) => (item.id === tagId ? { ...item, nome } : item)).sort(compararTagsPorNome));
  }

  abrirPaleta(evento: Event, alvo: AlvoPaleta, ancora: HTMLElement): void {
    if (alvo.tipo === 'tag' && this.eTemporaria(alvo.tag)) return;
    this.alvoPaleta.set(alvo);
    this.corPendentePersonalizada = null;
    this.popoverCor().show(evento, ancora);
  }

  /** Amostra da paleta: aplica na hora e fecha (dot → swatch = 2 cliques). Cor da roda/hex só vale ao fechar. */
  aoEscolherCor(cor: string): void {
    const alvo = this.alvoPaleta();
    if (!alvo || cor.toLowerCase() === this.corDoPopover().toLowerCase()) return;
    const daPaleta = CORES_PREDEFINIDAS.some((predefinida) => predefinida.toLowerCase() === cor.toLowerCase());
    if (!daPaleta) {
      this.corPendentePersonalizada = cor;
      return;
    }
    this.aplicarCor(alvo, cor);
    this.popoverCor().hide();
  }

  aoFecharPaleta(): void {
    const alvo = this.alvoPaleta();
    if (alvo && this.corPendentePersonalizada) this.aplicarCor(alvo, this.corPendentePersonalizada);
    this.corPendentePersonalizada = null;
  }

  /** Exclusão imediata (task 99): a tag sai da lista na hora e o toast oferece "Desfazer". */
  excluir(tag: TagResumoDto): void {
    if (this.eTemporaria(tag)) return;
    const listaAnterior = this.tags();
    this.tags.update((lista) => lista.filter((item) => item.id !== tag.id));
    this.alternarSelecao(tag, false);

    this.tagService.excluir(tag.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Tag "${tag.nome}" excluída`,
          desfazer: () => this.tagService.restaurar(tag.id),
          aposDesfazer: () => this.inserirTag(tag),
        }),
      error: () => this.tags.set(listaAnterior),
    });
  }

  alternarSelecao(tag: TagResumoDto, marcada: boolean): void {
    this.selecionadas.update((conjunto) => {
      const novo = new Set(conjunto);
      if (marcada) novo.add(tag.id);
      else novo.delete(tag.id);
      return novo;
    });
  }

  limparSelecao(): void {
    this.selecionadas.set(new Set());
  }

  /** Exclui as selecionadas de uma vez, com um único "Desfazer" que restaura todas. */
  excluirSelecionadas(): void {
    const alvos = this.tags().filter((tag) => this.selecionadas().has(tag.id) && !this.eTemporaria(tag));
    if (alvos.length === 0) return;
    const listaAnterior = this.tags();
    this.tags.update((lista) => lista.filter((item) => !alvos.some((alvo) => alvo.id === item.id)));
    this.limparSelecao();

    forkJoin(alvos.map((tag) => this.tagService.excluir(tag.id))).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `${alvos.length} tags excluídas`,
          desfazer: () => forkJoin(alvos.map((tag) => this.tagService.restaurar(tag.id))),
          aposDesfazer: () => alvos.forEach((tag) => this.inserirTag(tag)),
        }),
      error: () => this.buscarTagsAposFalha(listaAnterior),
    });
  }

  /** Cor trocada na grade: PUT imediato, com a mudança já visível e rollback se falhar. */
  private aplicarCor(alvo: AlvoPaleta, cor: string): void {
    if (alvo.tipo === 'nova') {
      const indice = CORES_PREDEFINIDAS.findIndex((predefinida) => predefinida.toLowerCase() === cor.toLowerCase());
      if (indice >= 0) this.indiceCor.set(indice);
      return;
    }
    const corAnterior = alvo.tag.cor;
    this.definirCorLocal(alvo.tag.id, cor);
    this.alvoPaleta.set({ tipo: 'tag', tag: { ...alvo.tag, cor } });
    this.tagService.alterar(alvo.tag.id, { cor }).subscribe({
      error: () => this.definirCorLocal(alvo.tag.id, corAnterior),
    });
  }

  private definirCorLocal(tagId: number, cor: string): void {
    this.tags.update((lista) => lista.map((item) => (item.id === tagId ? { ...item, cor } : item)));
  }

  /** Falha parcial na exclusão em lote: o servidor é a verdade, então recarrega. */
  private buscarTagsAposFalha(listaAnterior: TagResumoDto[]): void {
    this.tags.set(listaAnterior);
    this.buscarTags();
  }

  private inserirTag(tag: TagResumoDto): void {
    this.tags.update((lista) => [...lista, { id: tag.id, nome: tag.nome, cor: tag.cor }].sort(compararTagsPorNome));
  }

  private substituirTag(tag: TagAlteradaDto): void {
    this.tags.update((lista) =>
      lista.map((item) => (item.id === tag.id ? { id: tag.id, nome: tag.nome, cor: tag.cor } : item)).sort(compararTagsPorNome),
    );
  }
}
