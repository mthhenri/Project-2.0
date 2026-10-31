import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConversaDiretaSupervisaoResumoDto, MensagemDiretaSupervisaoParticipanteDto } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaAvatarComponent } from '../../components/mensagem-direta-avatar/mensagem-direta-avatar.component';
import { MensagemDiretaReferenciaCartaoComponent } from '../../components/mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component';
import { MensagemDiretaService } from '../../services/mensagem-direta.service';
import {
  MensagemNaConversa,
  agruparPorDia,
  formatarHora,
  mesclarMensagens,
  normalizarMensagem,
  previaDaMensagem,
  rotuloDaLista,
} from '../../utils/mensagem-direta.util';

const ESPERA_DA_BUSCA_MS = 400;
const CONVERSAS_POR_PAGINA = 20;
const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

interface ConversaAberta {
  conversaId: string;
  participantes: MensagemDiretaSupervisaoParticipanteDto[];
  mensagens: MensagemNaConversa[];
  proximoCursor: string | null;
  participantesAvisados: boolean;
  carregando: boolean;
  carregandoMais: boolean;
  erro: 'GERAL' | 'PRIVADA' | null;
}

/**
 * Supervisão do chat (task 214, só gestor): as conversas entre desenvolvedores, somente leitura. Abrir uma conversa grava a auditoria e avisa os
 * participantes (no máximo uma vez por dia); as mensagens mais antigas da mesma conversa não repetem nem a auditoria nem o aviso.
 */
@Component({
  selector: 'app-supervisao-chat',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    ToggleSwitchModule,
    TooltipModule,
    MarkdownVisualizadorComponent,
    MensagemDiretaAvatarComponent,
    MensagemDiretaReferenciaCartaoComponent,
  ],
  templateUrl: './supervisao-chat.page.html',
  styleUrl: './supervisao-chat.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisaoChatPage {
  private readonly mensagemDiretaService = inject(MensagemDiretaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formularioFiltros = new FormGroup({
    busca: new FormControl('', { nonNullable: true }),
    somenteCodigo: new FormControl(false, { nonNullable: true }),
  });

  protected readonly conversas = signal<ConversaDiretaSupervisaoResumoDto[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly carregandoLista = signal(true);
  protected readonly carregandoMaisConversas = signal(false);
  protected readonly erroDaLista = signal(false);
  protected readonly aberta = signal<ConversaAberta | null>(null);
  /** Os filtros viram signal na hora em que o debounce dispara, para o estado "sem resultado" saber se há filtro. */
  protected readonly filtrosAplicados = signal({ busca: '', somenteCodigo: false });

  protected readonly temFiltro = computed(() => this.filtrosAplicados().busca.trim() !== '' || this.filtrosAplicados().somenteCodigo);
  protected readonly haMaisConversas = computed(() => this.conversas().length < this.total());
  protected readonly grupos = computed(() => {
    const conversa = this.aberta();
    return conversa ? agruparPorDia(conversa.mensagens, new Date()) : [];
  });

  private carregamento = 0;

  constructor() {
    this.formularioFiltros.valueChanges
      .pipe(
        debounceTime(ESPERA_DA_BUSCA_MS),
        distinctUntilChanged((a, b) => a.busca === b.busca && a.somenteCodigo === b.somenteCodigo),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.filtrosAplicados.set(this.formularioFiltros.getRawValue());
        this.carregarConversas(1);
      });
    this.carregarConversas(1);
  }

  protected carregarConversas(pagina: number): void {
    const requisicao = ++this.carregamento;
    const { busca, somenteCodigo } = this.filtrosAplicados();
    if (pagina === 1) this.carregandoLista.set(true);
    else this.carregandoMaisConversas.set(true);
    this.erroDaLista.set(false);

    this.mensagemDiretaService
      .listarConversasSupervisionadas({ texto: busca.trim() || undefined, somenteCodigo: somenteCodigo || undefined, pagina, porPagina: CONVERSAS_POR_PAGINA })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          if (requisicao !== this.carregamento) return;
          this.conversas.set(pagina === 1 ? resposta.dados!.conversas : [...this.conversas(), ...resposta.dados!.conversas]);
          this.total.set(resposta.dados!.total);
          this.pagina.set(pagina);
          this.carregandoLista.set(false);
          this.carregandoMaisConversas.set(false);
        },
        error: () => {
          if (requisicao !== this.carregamento) return;
          this.erroDaLista.set(true);
          this.carregandoLista.set(false);
          this.carregandoMaisConversas.set(false);
        },
      });
  }

  protected carregarMaisConversas(): void {
    this.carregarConversas(this.pagina() + 1);
  }

  protected limparFiltros(): void {
    this.formularioFiltros.reset({ busca: '', somenteCodigo: false });
  }

  protected abrir(conversa: ConversaDiretaSupervisaoResumoDto): void {
    this.aberta.set({
      conversaId: conversa.conversaId,
      participantes: conversa.participantes,
      mensagens: [],
      proximoCursor: null,
      participantesAvisados: false,
      carregando: true,
      carregandoMais: false,
      erro: null,
    });
    this.mensagemDiretaService
      .lerConversaSupervisionada(conversa.conversaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          if (this.aberta()?.conversaId !== conversa.conversaId) return;
          this.aberta.set({
            conversaId: conversa.conversaId,
            participantes: resposta.dados!.participantes,
            mensagens: mesclarMensagens([], resposta.dados!.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
            proximoCursor: resposta.dados!.proximoCursor,
            participantesAvisados: resposta.dados!.participantesAvisados,
            carregando: false,
            carregandoMais: false,
            erro: null,
          });
        },
        error: (erro: unknown) => this.falhouAoAbrir(conversa.conversaId, erro),
      });
  }

  protected carregarMensagensAnteriores(): void {
    const conversa = this.aberta();
    if (!conversa?.proximoCursor || conversa.carregandoMais) return;
    this.aberta.set({ ...conversa, carregandoMais: true });
    this.mensagemDiretaService
      .lerConversaSupervisionada(conversa.conversaId, conversa.proximoCursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          const atual = this.aberta();
          if (!atual || atual.conversaId !== conversa.conversaId) return;
          this.aberta.set({
            ...atual,
            mensagens: mesclarMensagens(atual.mensagens, resposta.dados!.mensagens.map((mensagem) => normalizarMensagem(mensagem))),
            proximoCursor: resposta.dados!.proximoCursor,
            carregandoMais: false,
          });
        },
        error: () => {
          const atual = this.aberta();
          if (atual?.conversaId === conversa.conversaId) this.aberta.set({ ...atual, carregandoMais: false });
        },
      });
  }

  protected fechar(): void {
    this.aberta.set(null);
  }

  protected nomes(participantes: MensagemDiretaSupervisaoParticipanteDto[]): string {
    return participantes.map((participante) => participante.usuarioNome).join(' e ');
  }

  protected nomeDoAutor(mensagem: MensagemNaConversa, participantes: MensagemDiretaSupervisaoParticipanteDto[]): string {
    return participantes.find((participante) => participante.usuarioId === mensagem.autorUsuarioId)?.usuarioNome ?? NOME_DE_USUARIO_REMOVIDO;
  }

  protected previa(conversa: ConversaDiretaSupervisaoResumoDto): string {
    return previaDaMensagem(conversa.ultimaMensagem.texto, conversa.ultimaMensagem.contemCodigo, false);
  }

  protected quando(conversa: ConversaDiretaSupervisaoResumoDto): string {
    return rotuloDaLista(new Date(conversa.ultimaMensagem.createdDate), new Date());
  }

  protected hora(data: Date): string {
    return formatarHora(data);
  }

  private falhouAoAbrir(conversaId: string, erro: unknown): void {
    const atual = this.aberta();
    if (!atual || atual.conversaId !== conversaId) return;
    const privada = erro instanceof HttpErrorResponse && erro.status === 403;
    this.aberta.set({ ...atual, carregando: false, erro: privada ? 'PRIVADA' : 'GERAL' });
  }
}
