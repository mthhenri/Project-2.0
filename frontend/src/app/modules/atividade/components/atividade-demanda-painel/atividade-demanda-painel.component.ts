import { Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DemandaRecuperadaDto } from '@project20/shared';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { DemandaDescricaoEditorComponent } from '../../../demanda/components/demanda-descricao-editor/demanda-descricao-editor.component';
import { COR_NO_BORDA, ROTULO_STATUS_DEMANDA } from '../../../demanda/constants/demanda-cores.constants';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { CampoDocumentoDaDemanda } from '../atividade-documentos-indicador/atividade-documentos-indicador.component';

interface AbaDoPainel {
  campo: CampoDocumentoDaDemanda;
  rotulo: string;
  /** O nome na aba, curto para as três caberem lado a lado; o `rotulo` vai no nome acessível. */
  curto: string;
  tipo: 'cliente' | 'tecnica' | 'doc';
  icone: string;
}

const ABAS: readonly AbaDoPainel[] = [
  { campo: 'descricaoCliente', rotulo: 'Descrição do cliente', curto: 'Cliente', tipo: 'cliente', icone: 'pi pi-user' },
  { campo: 'descricaoTecnica', rotulo: 'Descrição técnica', curto: 'Técnica', tipo: 'tecnica', icone: 'icone-descricao icone-descricao--tecnica' },
  { campo: 'documentacao', rotulo: 'Documentação', curto: 'Documentação', tipo: 'doc', icone: 'icone-descricao icone-descricao--doc' },
];

/** Só a descrição técnica e a documentação se editam pela listagem de Atividades (a do cliente é lida). */
const CAMPOS_EDITAVEIS: readonly CampoDocumentoDaDemanda[] = ['descricaoTecnica', 'documentacao'];

/**
 * A demanda ao lado da lista de Atividades (task 288): trilha, nome, status, horas, as abas Cliente, Técnica e Documentação e o texto.
 * Quem pode editar tem "Editar", que troca o corpo pelo editor da task 278 (`app-demanda-descricao-editor`). Carrega a demanda por conta
 * própria; quem hospeda decide a linha e a aba abertas e, antes de trocá-las, chama `confirmarAntesDeSair` para não perder texto digitado.
 */
@Component({
  selector: 'app-atividade-demanda-painel',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, MarkdownVisualizadorComponent, DemandaDescricaoEditorComponent],
  providers: [ConfirmationService],
  templateUrl: './atividade-demanda-painel.component.html',
  styleUrl: './atividade-demanda-painel.component.scss',
})
export class AtividadeDemandaPainelComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly editor = viewChild(DemandaDescricaoEditorComponent);

  readonly demandaId = input.required<number>();
  readonly campo = input.required<CampoDocumentoDaDemanda>();
  readonly nomeProjeto = input<string>('');
  readonly nomeDemanda = input<string>('');

  /** Clicou noutra aba (a hospedeira troca o campo). */
  readonly campoEscolhido = output<CampoDocumentoDaDemanda>();
  /** Pediu para fechar o painel (já confirmado se havia texto não salvo). */
  readonly fechar = output<void>();
  /** Salvou o texto: a hospedeira acende ou apaga o ícone da linha. */
  readonly textoSalvo = output<{ demandaId: number; campo: CampoDocumentoDaDemanda; temConteudo: boolean }>();

  readonly abas = ABAS;
  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly erro = signal<boolean>(false);
  readonly editando = signal<boolean>(false);
  /** O que fazer quando o "Salvar" do aviso de texto não salvo terminar (trocar de aba, de linha ou fechar). */
  private depoisDeSalvar: (() => void) | null = null;

  readonly conteudo = computed(() => this.demanda()?.[this.campo()] ?? '');
  readonly podeEditar = computed(() => CAMPOS_EDITAVEIS.includes(this.campo()) && !!this.demanda()?.podeEditar);
  readonly corDoStatus = computed(() => {
    const demanda = this.demanda();
    return demanda ? COR_NO_BORDA[demanda.status] : 'transparent';
  });
  readonly rotuloDoStatus = computed(() => {
    const demanda = this.demanda();
    return demanda ? ROTULO_STATUS_DEMANDA[demanda.status] : '';
  });

  constructor() {
    // Outra demanda: carrega de novo. Outra aba da mesma demanda: só sai da edição (os três textos já vieram juntos).
    effect(() => {
      const id = this.demandaId();
      untracked(() => this.carregar(id));
    });
    effect(() => {
      this.campo();
      untracked(() => this.editando.set(false));
    });
  }

  private carregar(demandaId: number): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.demanda.set(null);
    this.editando.set(false);
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        this.carregando.set(false);
        if (this.demandaId() !== demandaId) return;
        if (!resposta.sucesso || !resposta.dados) this.erro.set(true);
        else this.demanda.set(resposta.dados);
      },
      error: () => {
        this.carregando.set(false);
        if (this.demandaId() === demandaId) this.erro.set(true);
      },
    });
  }

  iniciarEdicao(): void {
    this.editando.set(true);
  }

  /** Cancelar do editor: volta à leitura, perguntando antes se há texto não salvo. */
  sairDaEdicao(): void {
    this.confirmarAntesDeSair(() => this.editando.set(false));
  }

  /** Salvou no editor: recarrega o texto, avisa a hospedeira e volta à leitura (ou segue para o que esperava o Salvar). */
  aoSalvar(): void {
    const demandaId = this.demandaId();
    const campo = this.campo();
    this.textoSalvo.emit({ demandaId, campo, temConteudo: (this.editor()?.texto ?? '').trim() !== '' });
    this.carregar(demandaId);
    const seguinte = this.depoisDeSalvar;
    this.depoisDeSalvar = null;
    seguinte?.();
  }

  escolherAba(campo: CampoDocumentoDaDemanda): void {
    if (campo === this.campo()) return;
    this.confirmarAntesDeSair(() => this.campoEscolhido.emit(campo));
  }

  solicitarFechar(): void {
    this.confirmarAntesDeSair(() => this.fechar.emit());
  }

  /** Sem texto novo, segue direto; com texto novo, pergunta se salva (e segue depois de salvar) ou descarta (e segue). */
  confirmarAntesDeSair(seguir: () => void): void {
    const editor = this.editando() ? this.editor() : undefined;
    if (!editor?.temAlteracoesNaoSalvas()) {
      seguir();
      return;
    }
    this.confirmationService.confirm({
      key: 'atividade-painel-fechar',
      header: 'Alterações não salvas',
      message: `Você fez alterações em "${editor.titulo()}" que ainda não foram salvas. Deseja salvar antes de continuar?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Salvar',
      rejectLabel: 'Descartar',
      accept: () => {
        this.depoisDeSalvar = seguir;
        editor.salvar();
      },
      reject: () => seguir(),
    });
  }
}
