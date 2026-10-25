import { HttpErrorResponse } from '@angular/common/http';
import { Component, NgZone, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  limiteParaDesfazerProposta,
  PropostaIaGrupoItemDto,
  PropostaIaResumoDto,
  PropostaIaGrupoSituacaoEnum,
  StandardResponse,
  StatusPropostaIaEnum,
} from '@project20/shared';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PropostaIaService } from '../../services/proposta-ia.service';
import { posicoesDeQueDepende, PropostasDoGrupo, resumirGrupo } from '../../utils/proposta-grupo.util';
import { PropostaCartaoComponent } from '../proposta-cartao/proposta-cartao.component';

/**
 * As propostas de uma mesma resposta da IA num grupo só (task 227): cabeçalho com **Confirmar todas** e **Recusar todas**, cada proposta numa
 * linha numerada (o próprio `app-chat-proposta-cartao`, com tudo o que ele já faz), "depende da N" quando a proposta precisa de outra do
 * grupo e a opção de **tirar uma do grupo**. As ações em grupo vão ao backend numa chamada só, na ordem em que as propostas nasceram; o
 * resultado diz, por proposta, se deu certo ou o motivo, e a linha mostra esse motivo. Depois de tudo feito o cabeçalho resume
 * ("N feitas · Ver · Desfazer todas"). O grupo é de uma resposta só: respostas diferentes nunca se misturam.
 */
@Component({
  selector: 'app-chat-proposta-grupo',
  standalone: true,
  imports: [ButtonModule, TooltipModule, PropostaCartaoComponent],
  templateUrl: './proposta-grupo.component.html',
  styleUrl: './proposta-grupo.component.scss',
})
export class PropostaGrupoComponent {
  private readonly propostaIaService = inject(PropostaIaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly zona = inject(NgZone);

  /** As propostas da resposta, na ordem em que nasceram (a lista cresce enquanto a resposta chega). */
  readonly propostaIds = input.required<number[]>();
  /** Uma proposta do grupo mudou de situação (individualmente ou em grupo): a tela atualiza os botões de sugestão. */
  readonly resolvida = output<PropostaIaResumoDto>();

  readonly propostas = signal<PropostasDoGrupo>({});
  /** As que não deu para ler aqui: o cartão delas tenta sozinho e mostra o erro dele. */
  readonly falhasDeLeitura = signal<ReadonlySet<number>>(new Set());
  /** As pendentes que o usuário tirou do grupo: seguem pendentes, mas nenhuma ação em grupo as alcança. */
  readonly foraDoGrupo = signal<ReadonlySet<number>>(new Set());
  /** O motivo de a proposta não ter sido resolvida na última ação em grupo, por id. */
  readonly motivos = signal<Readonly<Record<number, string>>>({});
  readonly operando = signal(false);

  /** `null` enquanto o usuário não abriu nem fechou a lista: ela abre sozinha enquanto há o que decidir e fecha quando tudo está feito. */
  private readonly listaEscolhida = signal<boolean | null>(null);
  /** O relógio do grupo: só avança quando o prazo de desfazer de alguma feita vence, para "Desfazer todas" sumir sozinho. */
  private readonly agora = signal(Date.now());
  private readonly solicitadas = new Set<number>();

  readonly resumo = computed(() =>
    resumirGrupo(
      this.propostaIds().filter((id) => !this.falhasDeLeitura().has(id)),
      this.propostas(),
      this.foraDoGrupo(),
      new Date(this.agora()),
    ),
  );
  /**
   * Quando todas estão resolvidas a lista fecha (o cabeçalho resume), mas nunca esconde o que o usuário precisa ver: uma pendente que ele
   * tirou do grupo ou o motivo de uma proposta que não foi resolvida (um "Desfazer todas" que parou no meio, por exemplo).
   */
  readonly listaAberta = computed(
    () => this.listaEscolhida() ?? (!this.resumo().resolvido || this.resumo().foraDoGrupo.length > 0 || Object.keys(this.motivos()).length > 0),
  );
  /** "depende da 1" para cada pendente que precisa de outra do grupo. */
  readonly dependencias = computed<Readonly<Record<number, string>>>(() => {
    const ids = this.propostaIds();
    const propostas = this.propostas();
    const textos: Record<number, string> = {};
    for (const id of ids) {
      if (propostas[id]?.status !== StatusPropostaIaEnum.PENDENTE) continue;
      const posicoes = posicoesDeQueDepende(id, ids, propostas);
      if (posicoes.length > 0) textos[id] = `depende da ${posicoes.join(' e ')}`;
    }
    return textos;
  });
  /** "Todas" só quando todas do grupo estão em jogo: com uma fora do grupo, ou parte já feita pela IA (grupo misto), o botão diz quantas. */
  private readonly contaAsPendentes = computed(() => this.resumo().foraDoGrupo.length > 0 || this.resumo().misto);
  readonly rotuloConfirmar = computed(() => (this.contaAsPendentes() ? `Confirmar ${this.resumo().pendentes.length}` : 'Confirmar todas'));
  readonly rotuloRecusar = computed(() => (this.contaAsPendentes() ? `Recusar ${this.resumo().pendentes.length}` : 'Recusar todas'));

  constructor() {
    effect(() => {
      const ids = this.propostaIds();
      untracked(() => {
        for (const id of ids) {
          if (this.solicitadas.has(id)) continue;
          this.solicitadas.add(id);
          this.carregar(id);
        }
      });
    });
    effect((aoLimpar) => {
      const agora = Date.now();
      const proximos = Object.values(this.propostas())
        .filter((proposta): proposta is PropostaIaResumoDto => !!proposta && (proposta.status === StatusPropostaIaEnum.CONFIRMADA || proposta.status === StatusPropostaIaEnum.AJUSTADA))
        .map((proposta) => limiteParaDesfazerProposta(proposta.resolucaoData)?.getTime())
        .filter((limite): limite is number => limite !== undefined && limite + 1000 > agora);
      if (proximos.length === 0) return;
      const espera = Math.min(...proximos) - agora + 1000;
      if (espera <= 0 || espera > 2_147_000_000) return;
      // Fora da zona: um temporizador de até 30 min dentro dela seguraria a estabilização da aplicação (e dos testes).
      const temporizador = this.zona.runOutsideAngular(() => setTimeout(() => this.zona.run(() => this.agora.set(Date.now())), espera));
      aoLimpar(() => clearTimeout(temporizador));
    });
  }

  private carregar(id: number): void {
    this.propostaIaService.recuperarPorId(id).subscribe({
      next: (resposta) => {
        if (resposta.dados) this.atualizar(resposta.dados);
        else this.falhasDeLeitura.update((conjunto) => new Set(conjunto).add(id));
      },
      error: () => this.falhasDeLeitura.update((conjunto) => new Set(conjunto).add(id)),
    });
  }

  /** Guarda a proposta como a última leitura; a mesma referência não reagrava nada (o cartão devolve o que o grupo lhe passou). */
  private atualizar(proposta: PropostaIaResumoDto): void {
    this.propostas.update((atuais) => (atuais[proposta.id] === proposta ? atuais : { ...atuais, [proposta.id]: proposta }));
  }

  /** Uma proposta foi resolvida pelo próprio cartão (confirmar, ajustar, recusar ou desfazer da linha). */
  aoResolverUma(proposta: PropostaIaResumoDto): void {
    this.atualizar(proposta);
    this.motivos.update((atuais) => {
      if (!(proposta.id in atuais)) return atuais;
      const { [proposta.id]: _removido, ...resto } = atuais;
      return resto;
    });
    this.resolvida.emit(proposta);
  }

  /** A proposta já lida e ainda pendente (só ela pode ser tirada do grupo). */
  ehPendente(id: number): boolean {
    return this.propostas()[id]?.status === StatusPropostaIaEnum.PENDENTE;
  }

  tirarDoGrupo(id: number): void {
    this.foraDoGrupo.update((conjunto) => {
      const novo = new Set(conjunto);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });
  }

  alternarLista(): void {
    this.listaEscolhida.set(!this.listaAberta());
  }

  confirmarTodas(): void {
    const ids = this.resumo().pendentes;
    this.executar(this.propostaIaService.confirmarGrupo({ propostaIds: ids }), (itens) => {
      const feitas = itens.filter((item) => item.situacao === PropostaIaGrupoSituacaoEnum.RESOLVIDA).map((item) => item.propostaId);
      if (feitas.length > 0) {
        this.desfazerService.oferecer({
          mensagem: feitas.length === 1 ? 'Proposta confirmada' : `${feitas.length} propostas confirmadas`,
          desfazer: () => this.propostaIaService.desfazerGrupo({ propostaIds: feitas }).pipe(tap((resposta) => this.aplicarSePossivel(resposta))),
        });
      }
    });
  }

  recusarTodas(): void {
    this.executar(this.propostaIaService.recusarGrupo({ propostaIds: this.resumo().pendentes }));
  }

  desfazerTodas(): void {
    this.executar(this.propostaIaService.desfazerGrupo({ propostaIds: this.resumo().desfaziveis }));
  }

  /** No grupo misto: desfaz só o que a IA fez sozinha, deixando o que o usuário ainda decide como está. */
  desfazerDaIa(): void {
    this.executar(this.propostaIaService.desfazerGrupo({ propostaIds: this.resumo().desfaziveisPelaIa }));
  }

  /** Roda uma ação em grupo, aplica o resultado por proposta e avisa quando alguma não deu certo (o motivo fica na linha). */
  private executar(chamada: Observable<StandardResponse<{ itens: PropostaIaGrupoItemDto[] }>>, aoSucesso?: (itens: PropostaIaGrupoItemDto[]) => void): void {
    if (this.operando()) return;
    this.operando.set(true);
    chamada.subscribe({
      next: (resposta) => {
        this.operando.set(false);
        const itens = resposta.dados?.itens ?? [];
        this.aplicar(itens);
        aoSucesso?.(itens);
      },
      error: (erro: HttpErrorResponse) => {
        this.operando.set(false);
        this.messageService.add({ severity: 'warn', summary: 'Propostas', detail: erro.error?.mensagem ?? 'Não foi possível concluir a ação' });
      },
    });
  }

  private aplicarSePossivel(resposta: StandardResponse<{ itens: PropostaIaGrupoItemDto[] }>): void {
    if (resposta.dados) this.aplicar(resposta.dados.itens);
  }

  /** Atualiza cada linha com a proposta como ficou e guarda o motivo das que não foram resolvidas. */
  private aplicar(itens: PropostaIaGrupoItemDto[]): void {
    for (const item of itens) {
      if (item.proposta) this.atualizar(item.proposta);
      if (item.situacao === PropostaIaGrupoSituacaoEnum.RESOLVIDA && item.proposta) this.resolvida.emit(item.proposta);
    }
    this.motivos.update((atuais) => {
      const novos = { ...atuais };
      for (const item of itens) {
        if (item.situacao === PropostaIaGrupoSituacaoEnum.RESOLVIDA || !item.motivo) delete novos[item.propostaId];
        else novos[item.propostaId] = item.motivo;
      }
      return novos;
    });
    const naoResolvidas = itens.filter((item) => item.situacao !== PropostaIaGrupoSituacaoEnum.RESOLVIDA).length;
    if (naoResolvidas > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Propostas',
        detail: `${naoResolvidas} ${naoResolvidas === 1 ? 'proposta não foi resolvida' : 'propostas não foram resolvidas'}: o motivo está em cada linha.`,
      });
    }
  }
}
