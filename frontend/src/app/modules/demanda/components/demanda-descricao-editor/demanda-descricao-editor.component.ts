import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DemandaAlterarDto, DemandaRecuperadaDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { CampoDescricaoDemanda } from '../../utils/demanda-context-menu.factory';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';

const TITULOS: Record<CampoDescricaoDemanda, string> = {
  descricaoTecnica: 'Descrição Técnica',
  descricaoCliente: 'Descrição para o Cliente',
  documentacao: 'Documentação',
};

/**
 * O editor de uma descrição da demanda (técnica, do cliente ou documentação), sem janela: ocupa o lado do modo Dividido (task 278).
 * Carrega a demanda por conta própria, guarda o formulário e sabe dizer se há alteração não salva; quem hospeda decide o que fazer
 * ao trocar de demanda ou fechar (perguntar, descartar). Sem permissão de edição mostra só a leitura.
 */
@Component({
  selector: 'app-demanda-descricao-editor',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, MarkdownEditorComponent, MarkdownVisualizadorComponent, AssistenteDescricaoComponent],
  templateUrl: './demanda-descricao-editor.component.html',
  styleUrl: './demanda-descricao-editor.component.scss',
})
export class DemandaDescricaoEditorComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly demandaId = input.required<number>();
  readonly campo = input.required<CampoDescricaoDemanda>();

  /** Salvou com sucesso: a hospedeira atualiza a demanda e decide se fecha. */
  readonly salva = output<number>();
  /** Pediu para sair (Cancelar ou Fechar): a hospedeira confirma se houver alteração. */
  readonly fecharSolicitado = output<void>();

  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly erro = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly formulario = this.formBuilder.group({ valor: ['' as string | null] });
  /** O último conteúdo persistido: base da detecção de alterações não salvas. */
  private readonly conteudoSalvo = signal<string>('');
  /** O texto do formulário, como signal, para o botão Salvar reagir à digitação. */
  private readonly textoAtual = signal<string>('');

  readonly titulo = computed(() => TITULOS[this.campo()]);

  /** Descrição do cliente é só do gestor; técnica e documentação, de quem pode editar a demanda (gestor ou membro). */
  readonly podeEditar = computed(() => {
    const demandaDados = this.demanda();
    if (!demandaDados) return false;
    return this.campo() === 'descricaoCliente' ? this.sessao.eGestor() : demandaDados.podeEditar;
  });

  readonly temAlteracoesNaoSalvas = computed(() => this.podeEditar() && this.textoAtual() !== this.conteudoSalvo());

  constructor() {
    this.formulario.controls.valor.valueChanges.subscribe((valor) => this.textoAtual.set(valor ?? ''));

    // Trocou a demanda ou o campo: carrega de novo. Quem hospeda já resolveu o que fazer com o texto não salvo.
    effect(() => {
      const id = this.demandaId();
      const campo = this.campo();
      untracked(() => this.carregar(id, campo));
    });
  }

  get texto(): string {
    return this.textoAtual();
  }

  private carregar(demandaId: number, campo: CampoDescricaoDemanda): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.demanda.set(null);
    this.demandaService
      .recuperar(demandaId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso || !resposta.dados) {
            this.erro.set(true);
            return;
          }
          const valor = resposta.dados[campo] ?? '';
          this.demanda.set(resposta.dados);
          this.conteudoSalvo.set(valor);
          this.formulario.reset({ valor });
          this.textoAtual.set(valor);
        },
        error: () => this.erro.set(true),
      });
  }

  salvar(): void {
    const demandaDados = this.demanda();
    if (!demandaDados || !this.podeEditar() || this.carregandoSalvar()) return;

    const campo = this.campo();
    const valorEnviado = this.formulario.value.valor ?? '';
    const dto = { [campo]: valorEnviado } as DemandaAlterarDto;
    this.carregandoSalvar.set(true);
    this.demandaService
      .alterar(demandaDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.conteudoSalvo.set(valorEnviado);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `${this.titulo()} salva` });
          this.salva.emit(demandaDados.id);
        },
      });
  }

  aceitarTextoDoAssistente(texto: string): void {
    this.formulario.patchValue({ valor: texto });
  }
}
