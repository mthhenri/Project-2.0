import { Component, effect, inject, input, viewChild, viewChildren } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { TipoAnotacaoEnum } from '@project20/shared';
import { MarkdownEditorComponent, MenuContextoEditorEvento } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PadService } from '../../services/pad.service';
import { ICONE_SECAO_ANOTACAO, ORDEM_SECOES_PAD, ROTULO_SECAO_ANOTACAO } from '../../utils/anotacoes.util';
import { SecaoAnotacao } from '../usuario-anotacoes-dialog/secao-anotacao';

/**
 * O pad do usuário (tasks 114, 126 e 256): as cinco seções em acordeão, o editor de cada uma, Limpar, "Enviar para", o estado de gravação e o
 * Salvar com Ctrl+S. Não tem contêiner: o drawer da barra superior, a aba do chat e a tela de Documentações o colocam onde precisam e escolhem o
 * cabeçalho (`comTitulo`; os botões entram em `[padAcoes]`). O estado é o do `PadService`, um só para todos os lugares.
 */
@Component({
  selector: 'app-pad-painel',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    ContextMenuModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './pad-painel.component.html',
  styleUrl: './pad-painel.component.scss',
})
export class PadPainelComponent {
  protected readonly pad = inject(PadService);

  /** Falso mostra cada seção só no visualizador, sem salvar e sem "Limpar". */
  readonly editavel = input(true);
  /** Mostra o título e o "Editado há…" no cabeçalho. Sem título e sem `[padAcoes]` o cabeçalho some. */
  readonly comTitulo = input(true);
  /** O conteúdo numa coluna centralizada de até 880 px (o drawer em tela cheia). */
  readonly colunaCentral = input(false);

  readonly rotuloSecao = ROTULO_SECAO_ANOTACAO;
  readonly iconeSecao = ICONE_SECAO_ANOTACAO;
  private readonly editores = viewChildren(MarkdownEditorComponent);
  private readonly menuContexto = viewChild<ContextMenu>('menuContexto');

  /**
   * Menu do botão direito sobre um trecho selecionado: "Enviar para" com as cinco seções (a de origem fica
   * oculta ao abrir). Itens são propriedades diretas (um getter reconstruiria o menu a cada ciclo e ele fecharia).
   */
  readonly itensMenu: MenuItem[] = [
    {
      label: 'Enviar para',
      icon: 'pi pi-send',
      items: ORDEM_SECOES_PAD.map((tipo): MenuItem => ({
        id: tipo,
        label: ROTULO_SECAO_ANOTACAO[tipo],
        icon: ICONE_SECAO_ANOTACAO[tipo],
        command: () => this.enviarTrecho(tipo),
      })),
    },
  ];
  /** Seção e trecho do menu aberto (lidos quando um destino é escolhido). */
  private trechoDoMenu: { secao: SecaoAnotacao; texto: string } | null = null;

  constructor() {
    // Os editores só existem depois que o esqueleto some: o primeiro recebe o foco quando o pad termina de carregar.
    effect(() => {
      if (this.pad.carregando() || this.pad.secoes().length === 0) return;
      setTimeout(() => this.editores()[0]?.focar());
    });
  }

  /** Botão direito sobre um trecho selecionado: mostra "Enviar para" sem a própria seção. */
  abrirMenuDoTrecho(secao: SecaoAnotacao, selecao: MenuContextoEditorEvento): void {
    if (!this.editavel()) return;
    this.trechoDoMenu = { secao, texto: selecao.texto };
    this.itensMenu[0].items?.forEach((item) => (item.visible = item.id !== secao.tipo));
    this.menuContexto()?.show(selecao.evento);
  }

  limpar(secao: SecaoAnotacao): void {
    if (this.editavel()) this.pad.limpar(secao);
  }

  private enviarTrecho(destino: TipoAnotacaoEnum): void {
    const alvo = this.trechoDoMenu;
    if (alvo) this.pad.enviarTrecho(alvo.secao, destino, alvo.texto);
  }
}
