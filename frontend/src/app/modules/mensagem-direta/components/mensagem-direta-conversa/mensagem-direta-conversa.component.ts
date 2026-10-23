import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { EnvioDoCompositor, MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { AVISO_DE_LEITURA_DAS_CONVERSAS, agruparPorDia, formatarHora, idDaUltimaLidaPelaOutraPessoa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';
import { MensagemDiretaCompositorComponent } from '../mensagem-direta-compositor/mensagem-direta-compositor.component';
import { MensagemDiretaReferenciaCartaoComponent } from '../mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component';

/** Distância do fim (px) até a qual a conversa continua acompanhando as mensagens que chegam. */
const MARGEM_DO_FIM_PX = 80;
/** Distância do topo (px) a partir da qual se pede a página mais antiga. */
const MARGEM_DO_TOPO_PX = 40;

/** A conversa com uma pessoa no popup (mockups 1 e 9): balões, "Enviada"/"Lida", falha com reenvio e o campo de mensagem. */
@Component({
  selector: 'app-mensagem-direta-conversa',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, TooltipModule, MarkdownVisualizadorComponent, MensagemDiretaAvatarComponent, MensagemDiretaCompositorComponent, MensagemDiretaReferenciaCartaoComponent],
  templateUrl: './mensagem-direta-conversa.component.html',
  styleUrl: './mensagem-direta-conversa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaConversaComponent {
  protected readonly estado = inject(MensagemDiretaEstadoService);
  protected readonly avisoDeLeitura = AVISO_DE_LEITURA_DAS_CONVERSAS;
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly referencias = inject(MensagemDiretaReferenciaService);
  private readonly messageService = inject(MessageService);
  private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');

  protected readonly aberta = this.estado.conversaAberta;
  protected readonly meuId = this.sessao.id;
  /** Só a outra pessoa da conversa pode ser mencionada (a regra do servidor: quem não lê a conversa não é avisado dela). */
  protected readonly pessoasMencionaveis = computed(() => {
    const aberta = this.aberta();
    return aberta ? [{ usuarioId: aberta.usuarioId, nome: aberta.usuarioNome }] : [];
  });
  protected readonly estaDigitando = computed(() => {
    const aberta = this.aberta();
    return aberta ? this.estado.digitando().has(aberta.usuarioId) : false;
  });
  protected readonly estaOnline = computed(() => {
    const aberta = this.aberta();
    return aberta ? this.estado.online().has(aberta.usuarioId) : false;
  });

  protected readonly grupos = computed(() => agruparPorDia(this.aberta()?.mensagens ?? [], new Date()));
  protected readonly lidaId = computed(() => {
    const aberta = this.aberta();
    const meuId = this.sessao.id();
    return aberta && meuId !== undefined ? idDaUltimaLidaPelaOutraPessoa(aberta.mensagens, meuId, aberta.lidaPeloOutroAte) : null;
  });
  protected readonly ultimaMinhaId = computed(() => {
    const aberta = this.aberta();
    const meuId = this.sessao.id();
    if (!aberta || meuId === undefined) return null;
    return [...aberta.mensagens].reverse().find((mensagem) => mensagem.autorUsuarioId === meuId && mensagem.situacao === 'ENVIADA')?.mensagemId ?? null;
  });

  /** Só muda quando se abre OUTRA pessoa: o compositor foca o campo por ela, e o foco não pode voltar a cada mensagem, leitura ou releitura. */
  protected readonly pessoaAberta = computed(() => this.aberta()?.usuarioId ?? null);
  private readonly totalDeMensagens = computed(() => this.aberta()?.mensagens.length ?? 0);

  /** Nome de cada demanda/atividade citada (`TIPO:id`), conforme chega do servidor; só as acessíveis têm nome. */
  private readonly nomesDasReferencias = signal<ReadonlyMap<string, string>>(new Map());

  /** A mensagem cujo texto acabou de ser copiado (o botão mostra "Copiado" por um instante). */
  protected readonly copiadaId = signal<string | null>(null);
  private temporizadorDoCopiado: ReturnType<typeof setTimeout> | null = null;

  private colarNoFim = true;
  private alturaAntes: number | null = null;
  private topoAntes = 0;
  private totalAntes = 0;
  private totalVisto = 0;

  constructor() {
    // Quando o NÚMERO de mensagens muda: acompanha o fim se o usuário está lá, ou mantém o ponto que ele lia quando chega uma página mais antiga.
    effect(() => {
      this.totalDeMensagens();
      setTimeout(() => this.ajustarRolagem(), 0);
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
    });

    // Os nomes das referências vêm da consulta dos cartões (guardada por sessão, então não repete a chamada).
    effect(() => {
      for (const mensagem of this.aberta()?.mensagens ?? []) {
        for (const referencia of mensagem.referencias) void this.guardarNomeDaReferencia(referencia.tipo, referencia.id);
      }
    });

  }

  /** `@Nome` das pessoas mencionadas e `#Nome` das referências da mensagem: o que o texto mostra com destaque. */
  protected destaquesDe(mensagem: { mencoes: number[]; referencias: { tipo: ReferenciaMensagemDiretaEnum; id: number }[] }): string[] {
    const aberta = this.aberta();
    const nomes = new Map<number, string>();
    if (aberta) nomes.set(aberta.usuarioId, aberta.usuarioNome);
    const meuId = this.sessao.id();
    const meuNome = this.sessao.nomeCompleto();
    if (meuId !== undefined && meuNome) nomes.set(meuId, meuNome);
    const destaques: string[] = [];
    for (const usuarioId of mensagem.mencoes) {
      const nome = nomes.get(usuarioId);
      if (nome) destaques.push(`@${nome}`);
    }
    for (const referencia of mensagem.referencias) {
      const nome = this.nomesDasReferencias().get(`${referencia.tipo}:${referencia.id}`);
      if (nome) destaques.push(`#${nome}`);
    }
    return destaques;
  }

  private async guardarNomeDaReferencia(tipo: ReferenciaMensagemDiretaEnum, id: number): Promise<void> {
    const chave = `${tipo}:${id}`;
    if (this.nomesDasReferencias().has(chave)) return;
    const dados = await this.referencias.recuperar(tipo, id);
    if (!dados?.acessivel || !dados.nome) return;
    this.nomesDasReferencias.update((atuais) => new Map(atuais).set(chave, dados.nome as string));
  }

  /** Copia o texto da mensagem como foi escrito (o Markdown), inclusive blocos de código. */
  protected async copiar(mensagemId: string, texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Mensagem', detail: 'Não foi possível copiar a mensagem' });
      return;
    }
    this.copiadaId.set(mensagemId);
    if (this.temporizadorDoCopiado) clearTimeout(this.temporizadorDoCopiado);
    this.temporizadorDoCopiado = setTimeout(() => this.copiadaId.set(null), TEMPO_DO_COPIADO_MS);
  }

  protected voltar(): void {
    this.estado.voltarParaALista();
  }

  protected hora(data: Date): string {
    return formatarHora(data);
  }

  protected aoRolar(): void {
    const el = this.rolagem()?.nativeElement;
    if (!el) return;
    this.colarNoFim = el.scrollHeight - el.scrollTop - el.clientHeight < MARGEM_DO_FIM_PX;
    const aberta = this.aberta();
    if (el.scrollTop < MARGEM_DO_TOPO_PX && aberta?.proximoCursor && !aberta.carregandoMais && !aberta.carregando) {
      this.alturaAntes = el.scrollHeight;
      this.topoAntes = el.scrollTop;
      this.totalAntes = aberta.mensagens.length;
      void this.estado.carregarMais();
    }
  }

  private ajustarRolagem(): void {
    const el = this.rolagem()?.nativeElement;
    if (!el) return;
    const total = this.aberta()?.mensagens.length ?? 0;
    const cresceu = total > this.totalVisto;
    this.totalVisto = total;
    if (this.alturaAntes !== null) {
      // Só vale como "chegou a página mais antiga" quando as mensagens aumentaram (o indicador de carregamento também muda a altura).
      if (total > this.totalAntes) {
        el.scrollTop = el.scrollHeight - this.alturaAntes + this.topoAntes;
        this.alturaAntes = null;
      } else if (!this.aberta()?.carregandoMais) {
        this.alturaAntes = null;
      }
      return;
    }
    if (this.colarNoFim && cresceu) el.scrollTop = el.scrollHeight;
  }

  protected aoDigitar(): void {
    const aberta = this.aberta();
    if (aberta) this.estado.avisarDigitacao(aberta.usuarioId);
  }

  protected aoEnviar(envio: EnvioDoCompositor): void {
    this.colarNoFim = true;
    void this.estado.enviar(envio);
  }

  protected tentarDeNovo(mensagemId: string): void {
    void this.estado.tentarDeNovo(mensagemId);
  }

  protected excluir(mensagemId: string): void {
    this.estado.excluirLocal(mensagemId);
  }
}
