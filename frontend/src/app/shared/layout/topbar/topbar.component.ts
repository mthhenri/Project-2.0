import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
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
import { UsuarioAnotacoesDialogComponent } from '../../../modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    PopoverModule,
    TooltipModule,
    DividerModule,
    ColorPickerModule,
    UsuarioAnotacoesDialogComponent,
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
    { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto',      somenteGestor: false },
    { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario', somenteGestor: true  },
    { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto',    somenteGestor: true  },
    { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda',    somenteGestor: false },
    { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade',  somenteGestor: false },
    { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao',   somenteGestor: false },
    { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag',        somenteGestor: true  },
    { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario',    somenteGestor: true  },
  ];

  readonly itensNavegacao = computed(() =>
    this.todosItensNavegacao.filter((item) => !item.somenteGestor || this.sessao.eGestor()),
  );

  constructor() {
    this.atualizarHora();
    this.agendarProximaAtualizacao();
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
