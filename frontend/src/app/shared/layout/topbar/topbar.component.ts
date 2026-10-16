import { Component, DestroyRef, HostListener, ViewChild, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { TemaService } from '../../../core/services/tema.service';
import { TemaPersonalizadoService } from '../../../core/services/tema-personalizado.service';
import { VisualizacaoTempoService } from '../../../core/services/visualizacao-tempo.service';
import { CORES_SUGERIDAS, COR_PRIMARIA_PADRAO_HEX } from '../../../core/models/tema-personalizado.model';
import { ExecucaoAtivaService } from '../../../core/services/execucao-ativa.service';
import { ChipExecucaoAtivaComponent } from './chip-execucao-ativa/chip-execucao-ativa.component';
import { UsuarioAnotacoesDialogComponent } from '../../../modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    RouterModule,
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
  @ViewChild('anotacoesDialog') private anotacoesDialog?: UsuarioAnotacoesDialogComponent;
  readonly horaAtual = signal<string>('');

  readonly coresSugeridas = CORES_SUGERIDAS;

  /** Revela o atalho "???" ao clicar com o botão direito na troca de tema. */
  readonly mostrarEnigma = signal<boolean>(false);

  /** Valor do color picker (hex sem '#', formato do p-colorpicker). */
  readonly corControl = new FormControl<string>(
    (this.temaPersonalizado.corCustomizada() ?? COR_PRIMARIA_PADRAO_HEX).replace('#', ''),
    { nonNullable: true },
  );

  private readonly todosItensNavegacao = [
    { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto',      tecla: 'p', somenteGestor: false },
    { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario', tecla: 'c', somenteGestor: true  },
    { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto',    tecla: 'j', somenteGestor: true  },
    { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda',    tecla: 'd', somenteGestor: false },
    { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade',  tecla: 'a', somenteGestor: false },
    { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao',   tecla: 'e', somenteGestor: false },
    { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag',        tecla: 't', somenteGestor: true  },
    { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario',    tecla: 'u', somenteGestor: true  },
  ];

  readonly itensNavegacao = computed(() =>
    this.todosItensNavegacao.filter((item) => !item.somenteGestor || this.sessao.eGestor()),
  );

  /** Itens só de gestor: abaixo de 900px saem da barra e entram em "Mais ▾" (dev não vê o "Mais"). */
  readonly itensGestorOcultaveis = computed(() =>
    this.itensNavegacao().filter((item) => item.somenteGestor),
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

  // --- Atalhos globais: `g` + letra navega; `n` abre as anotações (task 96) ---
  private aguardandoSegundaTecla = false;
  private temporizadorAtalho: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:keydown', ['$event'])
  aoTeclarGlobal(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (this.focoEmCampo(evento.target) || this.haSobreposicaoAberta()) {
      this.cancelarSequencia();
      return;
    }

    const tecla = evento.key.toLowerCase();
    if (this.aguardandoSegundaTecla) {
      this.cancelarSequencia();
      const destino = this.itensNavegacao().find((item) => item.tecla === tecla);
      if (destino) {
        evento.preventDefault();
        this.roteador.navigateByUrl(destino.rotaLink);
      }
      return;
    }

    if (tecla === 'g') {
      this.aguardandoSegundaTecla = true;
      this.temporizadorAtalho = setTimeout(() => this.cancelarSequencia(), 1500);
    } else if (tecla === 'n' && this.sessao.usuarioAtual()) {
      evento.preventDefault();
      this.anotacoesDialog?.abrir(this.sessao.id()!, this.sessao.nomeCompleto()!);
    }
  }

  private cancelarSequencia(): void {
    this.aguardandoSegundaTecla = false;
    if (this.temporizadorAtalho !== null) clearTimeout(this.temporizadorAtalho);
    this.temporizadorAtalho = null;
  }

  /** Digitando: input, textarea, select ou editor rico (Quill/contenteditable). */
  private focoEmCampo(alvo: EventTarget | null): boolean {
    const elemento = alvo as HTMLElement | null;
    if (!elemento) return false;
    return (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName) ||
      elemento.isContentEditable ||
      !!elemento.closest('.ql-editor, [contenteditable="true"]')
    );
  }

  /** Dialog, popover ou overlay do PrimeNG aberto: os atalhos ficam quietos. */
  private haSobreposicaoAberta(): boolean {
    return !!document.querySelector('.p-dialog-mask, .p-popover, .p-select-overlay, .p-multiselect-overlay, .p-datepicker-panel, .p-contextmenu');
  }

  constructor() {
    this.execucaoAtiva.carregar();
    this.atualizarHora();
    this.agendarProximaAtualizacao();
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
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
