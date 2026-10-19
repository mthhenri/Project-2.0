import { Component, DestroyRef, HostListener, ViewChild, inject, signal, computed } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { ColorPickerModule } from 'primeng/colorpicker';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstadoIaEnum, dataHoraNoFuso } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { DesktopDownloadService } from '../../../core/services/desktop-download.service';
import { formatarTamanhoDoArquivo } from '../../../core/utils/tamanho-do-arquivo';
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { rotuloTipoUsuario } from '../../../core/utils/tipo-usuario';
import { TemaService } from '../../../core/services/tema.service';
import { TemaPersonalizadoService } from '../../../core/services/tema-personalizado.service';
import { VisualizacaoTempoService } from '../../../core/services/visualizacao-tempo.service';
import { CORES_SUGERIDAS, COR_PRIMARIA_PADRAO_HEX } from '../../../core/models/tema-personalizado.model';
import { focoEmCampo, haSobreposicaoAberta } from '../../../core/utils/atalhos';
import { ExecucaoAtivaService } from '../../../core/services/execucao-ativa.service';
import { IaDisponibilidadeService } from '../../../core/services/ia-disponibilidade.service';
import { ChipExecucaoAtivaComponent } from './chip-execucao-ativa/chip-execucao-ativa.component';
import { UsuarioAnotacoesDialogComponent } from '../../../modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    ToggleSwitchModule,
    ButtonModule,
    PopoverModule,
    TooltipModule,
    DividerModule,
    ColorPickerModule,
    UsuarioAnotacoesDialogComponent,
    ChipExecucaoAtivaComponent,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly autenticacaoService = inject(AutenticacaoService);
  readonly sessao = inject(UsuarioSessaoService);
  readonly tema = inject(TemaService);
  readonly temaPersonalizado = inject(TemaPersonalizadoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly execucaoAtiva = inject(ExecucaoAtivaService);
  private readonly roteador = inject(Router);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  readonly desktopDownload = inject(DesktopDownloadService);
  readonly formatarTamanho = formatarTamanhoDoArquivo;
  /** Depois do "Agora não" com a IA no ar: o botão para voltar para ela fica à vista. */
  readonly podeVoltarParaAIa = computed(() => this.iaDisponibilidade.modoConvencional() && this.iaDisponibilidade.estadoReal() === EstadoIaEnum.NO_AR);
  @ViewChild('anotacoesDialog') private anotacoesDialog?: UsuarioAnotacoesDialogComponent;
  readonly rotuloTipo = rotuloTipoUsuario;
  readonly horaAtual = signal<string>('');

  voltarParaAIa(): void {
    this.iaDisponibilidade.voltarParaAIa();
    void this.roteador.navigateByUrl('/chat');
  }

  readonly coresSugeridas = CORES_SUGERIDAS;

  /** Revela o atalho "???" ao clicar com o botão direito na troca de tema. */
  readonly mostrarEnigma = signal<boolean>(false);

  /** Valor do color picker (hex sem '#', formato do p-colorpicker). */
  readonly corControl = new FormControl<string>(
    (this.temaPersonalizado.corCustomizada() ?? COR_PRIMARIA_PADRAO_HEX).replace('#', ''),
    { nonNullable: true },
  );

  readonly iniciais = computed(() =>
    (this.sessao.nomeCompleto() ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase(),
  );
  readonly primeiroNome = computed(() => (this.sessao.nomeCompleto() ?? '').split(' ')[0]);

  // --- Atalho global: `n` abre as anotações (task 96); `g` + letra vive na barra lateral ---
  @HostListener('document:keydown', ['$event'])
  aoTeclarGlobal(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;

    if (evento.key.toLowerCase() === 'n' && this.sessao.usuarioAtual()) {
      evento.preventDefault();
      this.anotacoesDialog?.abrir(this.sessao.id()!, this.sessao.nomeCompleto()!);
    }
  }

  constructor() {
    this.execucaoAtiva.carregar();
    this.desktopDownload.carregar();
    this.atualizarHora();
    this.agendarProximaAtualizacao();

    // Deep-link `/ponto?anotacoes=:id` (task 114): o drawer das próprias anotações vive aqui. Na
    // listagem de Usuários quem abre é a própria página.
    this.roteador.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (!(evento instanceof NavigationEnd)) return;
      const arvore = this.roteador.parseUrl(evento.urlAfterRedirects);
      // Deep-link `?baixar-desktop=1` (task 198): o aviso de versão nova no app do desktop abre o Project no navegador e o download começa aqui.
      if (arvore.queryParams['baixar-desktop']) {
        this.desktopDownload.baixar();
        this.roteador.navigate([], { queryParams: { 'baixar-desktop': null }, queryParamsHandling: 'merge', replaceUrl: true });
        return;
      }
      const usuarioId = Number(arvore.queryParams['anotacoes']);
      if (!usuarioId || arvore.root.children['primary']?.segments[0]?.path === 'usuario') return;
      this.anotacoesDialog?.abrir(usuarioId, usuarioId === this.sessao.id() ? this.sessao.nomeCompleto()! : '');
      this.roteador.navigate([], { queryParams: { anotacoes: null }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  /** Volta para a aba/janela: o backend pode ter encerrado a execução (cron das 23:59:59). */
  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  ressincronizarExecucao(): void {
    if (document.visibilityState === 'visible') this.execucaoAtiva.carregar();
  }

  private agendarProximaAtualizacao(): void {
    const agora = new Date();
    const msAteProximoMinuto = (60 - agora.getSeconds()) * 1000 - agora.getMilliseconds();
    timer(msAteProximoMinuto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.atualizarHora();
        this.agendarProximaAtualizacao();
      });
  }

  private atualizarHora(): void {
    const [data, hora] = dataHoraNoFuso(new Date(), ambiente.fusoHorario).split(' ');
    this.horaAtual.set(`${hora} ${data}`);
  }

  sair(): void {
    this.autenticacaoService.logout();
  }

  /** Botão direito na troca de tema: suprime o menu do navegador e revela o "???". */
  revelarEnigma(evento: MouseEvent): void {
    evento.preventDefault();
    if (!this.temaPersonalizado.desbloqueado()) {
      this.mostrarEnigma.set(true);
    }
  }

  /** Clique no "???": habilita o tema personalizado e esconde o atalho. */
  desbloquearTema(): void {
    this.temaPersonalizado.desbloquear();
    this.mostrarEnigma.set(false);
  }

  /** Aplica um atalho de cor pronto e sincroniza o color picker. */
  aplicarCorSugerida(hex: string): void {
    this.corControl.setValue(hex.replace('#', ''));
    this.temaPersonalizado.definirCor(hex);
  }

  /** Aplica a cor escolhida no color picker (p-colorpicker emite hex sem '#'). */
  aplicarCorEscolhida(valor: string | object): void {
    if (typeof valor === 'string') {
      this.temaPersonalizado.definirCor(valor);
    }
  }

  /** Volta ao azul padrão mantendo o tema personalizado desbloqueado. */
  voltarAoPadrao(): void {
    this.corControl.setValue(COR_PRIMARIA_PADRAO_HEX.replace('#', ''));
    this.temaPersonalizado.resetarCor();
  }

  /** Esquece o tema personalizado por completo, voltando ao estado inicial. */
  esquecerTema(): void {
    this.temaPersonalizado.retrancar();
  }
}
