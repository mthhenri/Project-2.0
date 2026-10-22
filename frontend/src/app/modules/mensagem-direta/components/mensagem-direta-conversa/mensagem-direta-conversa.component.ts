import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { EnvioDoCompositor, MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { agruparPorDia, formatarHora, idDaUltimaLidaPelaOutraPessoa } from '../../utils/mensagem-direta.util';
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
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');

  protected readonly aberta = this.estado.conversaAberta;
  protected readonly meuId = this.sessao.id;
  /** Só a outra pessoa da conversa pode ser mencionada (a regra do servidor: quem não lê a conversa não é avisado dela). */
  protected readonly pessoasMencionaveis = computed(() => {
    const aberta = this.aberta();
    return aberta ? [{ usuarioId: aberta.usuarioId, nome: aberta.usuarioNome }] : [];
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
