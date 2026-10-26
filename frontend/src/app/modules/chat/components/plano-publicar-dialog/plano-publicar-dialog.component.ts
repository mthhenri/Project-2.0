import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MessageService, SharedModule } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import {
  DemandaRecuperadaDto,
  PlanoAbaEnum,
  PlanoPublicadoDto,
  PlanoRecuperadoDto,
  SituacaoDaAbaNaPublicacaoEnum,
  TipoPlanoPontoSituacaoEnum,
  campoDaAbaDoPlano,
  podeVerAbaDoPlano,
  situacaoDaAbaNaPublicacao,
  textoDaAbaDoPlano,
} from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DiffPorPalavraComponent } from '../../../../shared/components/diff-por-palavra/diff-por-palavra.component';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { PlanoService } from '../../services/plano.service';
import { ROTULO_ABA_DO_PLANO } from '../../utils/plano.util';

/** Uma aba na publicação: o texto atual da demanda, o do plano e o que publicar faria. */
interface LinhaDaPublicacao {
  aba: PlanoAbaEnum;
  rotulo: string;
  antes: string;
  depois: string;
  situacao: SituacaoDaAbaNaPublicacaoEnum;
}

/**
 * Publicar o plano na demanda ligada (task 237): a pessoa escolhe os textos, vê o diff por palavra contra o texto atual da demanda e confirma.
 * Mostra os pontos ainda abertos (task 235) como lembrete. O plano precisa estar gravado: o diff é do texto gravado, e a gravação leva a `versao`
 * lida (o plano mudou depois, o servidor recusa com 409). Texto vazio no plano só apaga o da demanda se a pessoa marcar isso. Análogo visual: o
 * diálogo de detalhe da demanda e o `proposta-cartao`.
 */
@Component({
  selector: 'app-plano-publicar-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, DialogModule, SharedModule, SkeletonModule, DiffPorPalavraComponent],
  templateUrl: './plano-publicar-dialog.component.html',
  styleUrl: './plano-publicar-dialog.component.scss',
})
export class PlanoPublicarDialogComponent {
  readonly plano = input.required<PlanoRecuperadoDto>();
  readonly visivel = model(false);

  /** Publicou: quem abriu relê o plano (a data de publicação mudou). */
  readonly publicado = output<PlanoPublicadoDto>();
  /** O servidor recusou porque o plano mudou depois do diff: quem abriu o relê. */
  readonly desatualizado = output<void>();

  private readonly planoService = inject(PlanoService);
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly Situacao = SituacaoDaAbaNaPublicacaoEnum;
  readonly carregando = signal(false);
  readonly erroAoCarregar = signal(false);
  readonly publicando = signal(false);
  readonly erro = signal<string | null>(null);
  private readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly pontosAbertos = signal(0);
  /** As abas marcadas para publicar; as que apagariam o texto da demanda só entram se a pessoa as marcar. */
  readonly marcadas = signal<ReadonlySet<PlanoAbaEnum>>(new Set());

  readonly linhas = computed<LinhaDaPublicacao[]>(() => {
    const demanda = this.demanda();
    if (!demanda) return [];
    const plano = this.plano();
    const tipo = this.sessao.usuarioAtual()?.tipo;
    return (Object.values(PlanoAbaEnum) as PlanoAbaEnum[])
      .filter((aba) => !!tipo && podeVerAbaDoPlano(aba, tipo))
      .map((aba) => {
        const antes = demanda[campoDaAbaDoPlano(aba)] ?? '';
        const depois = textoDaAbaDoPlano(plano, aba) ?? '';
        return { aba, rotulo: ROTULO_ABA_DO_PLANO[aba], antes, depois, situacao: situacaoDaAbaNaPublicacao(depois, antes) };
      });
  });
  /** Pode publicar: há uma aba marcada que muda a demanda. */
  readonly podePublicar = computed(() => this.linhas().some((linha) => linha.situacao !== SituacaoDaAbaNaPublicacaoEnum.IGUAL && this.marcadas().has(linha.aba)));
  readonly nenhumaMudanca = computed(() => this.linhas().length > 0 && this.linhas().every((linha) => linha.situacao === SituacaoDaAbaNaPublicacaoEnum.IGUAL));

  constructor() {
    effect(() => {
      if (this.visivel()) untracked(() => this.carregar());
    });
  }

  alternar(aba: PlanoAbaEnum, marcada: boolean): void {
    this.marcadas.update((atual) => {
      const proxima = new Set(atual);
      if (marcada) proxima.add(aba);
      else proxima.delete(aba);
      return proxima;
    });
  }

  fechar(): void {
    this.visivel.set(false);
  }

  carregar(): void {
    const demandaId = this.plano().demandaId;
    if (demandaId === null) return;
    this.carregando.set(true);
    this.erroAoCarregar.set(false);
    this.erro.set(null);
    this.demanda.set(null);
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        this.demanda.set(resposta.dados ?? null);
        this.erroAoCarregar.set(!resposta.dados);
        // Já vêm marcadas as abas que mudam a demanda; a que apagaria o texto dela fica por conta da pessoa.
        this.marcadas.set(new Set(this.linhas().filter((linha) => linha.situacao === SituacaoDaAbaNaPublicacaoEnum.PUBLICARIA).map((linha) => linha.aba)));
        this.carregando.set(false);
      },
      error: () => {
        this.erroAoCarregar.set(true);
        this.carregando.set(false);
      },
    });
    this.planoService.listarPontos(this.plano().id).subscribe({
      next: (resposta) => this.pontosAbertos.set((resposta.dados ?? []).filter((ponto) => ponto.situacao === TipoPlanoPontoSituacaoEnum.ABERTO).length),
      error: () => this.pontosAbertos.set(0),
    });
  }

  publicar(): void {
    if (!this.podePublicar() || this.publicando()) return;
    const escolhidas = this.linhas().filter((linha) => linha.situacao !== SituacaoDaAbaNaPublicacaoEnum.IGUAL && this.marcadas().has(linha.aba));
    const abasParaApagar = escolhidas.filter((linha) => linha.situacao === SituacaoDaAbaNaPublicacaoEnum.APAGARIA).map((linha) => linha.aba);
    this.publicando.set(true);
    this.erro.set(null);
    this.planoService
      .publicar(this.plano().id, {
        versao: this.plano().versao,
        abas: escolhidas.map((linha) => linha.aba),
        ...(abasParaApagar.length > 0 && { abasParaApagar }),
      })
      .subscribe({
        next: (resposta) => {
          this.publicando.set(false);
          if (!resposta.dados) return;
          this.messageService.add({
            severity: resposta.dados.trechosPendentes > 0 ? 'warn' : 'success',
            summary: 'Plano publicado',
            detail: this.detalheDaPublicacao(resposta.dados),
          });
          this.fechar();
          this.publicado.emit(resposta.dados);
        },
        error: (falha: HttpErrorResponse) => {
          this.publicando.set(false);
          this.erro.set(falha.error?.mensagem ?? 'Não foi possível publicar o plano');
          if (falha.status === 409) this.desatualizado.emit();
        },
      });
  }

  private detalheDaPublicacao(publicado: PlanoPublicadoDto): string {
    const textos = publicado.abasPublicadas.length === 1 ? 'texto gravado' : 'textos gravados';
    const base = `${publicado.abasPublicadas.length} ${textos} na demanda.`;
    if (publicado.trechosPendentes === 0) return base;
    const alteracoes = publicado.trechosPendentes === 1 ? '1 alteração de trecho da IA ainda pendente ficou' : `${publicado.trechosPendentes} alterações de trecho da IA ainda pendentes ficaram`;
    return `${base} ${alteracoes} de fora: aceite-a no chat e publique de novo.`;
  }
}
