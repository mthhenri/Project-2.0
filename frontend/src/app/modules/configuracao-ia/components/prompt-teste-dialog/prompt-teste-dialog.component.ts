import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { MAXIMO_DE_NARRATIVAS, NIVEL_DO_TIPO_DE_PROMPT, NivelIaEnum, PromptTestadoDto, TipoPromptEnum } from '@project20/shared';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { ROTULO_NIVEL } from '../../../chat/utils/chat.util';
import { PromptService } from '../../services/prompt.service';

const CHAVE_NARRATIVAS = 'prompt-teste.narrativas.';

/**
 * Testar o prompt antes de salvar (task 140): o administrador cola até 5 narrativas e vê, para cada uma, a resposta do prompt ativo e a
 * do texto que está no editor, lado a lado. Nada é gravado (nem no chat). As narrativas ficam no navegador, por tipo. O nível analítico
 * (o mais caro) pede confirmação antes de rodar. Análogo visual: o dialog "Nova atividade" e os cartões da aba Prompts.
 */
@Component({
  selector: 'app-prompt-teste-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, SkeletonModule, TextareaModule, MarkdownVisualizadorComponent],
  templateUrl: './prompt-teste-dialog.component.html',
  styleUrl: './prompt-teste-dialog.component.scss',
})
export class PromptTesteDialogComponent {
  private readonly promptService = inject(PromptService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly visivel = model(false);
  readonly tipo = input.required<TipoPromptEnum>();
  /** O texto candidato: o que está no editor do rascunho. */
  readonly conteudo = input.required<string>();

  readonly limite = MAXIMO_DE_NARRATIVAS;
  readonly rotuloNivel = ROTULO_NIVEL;
  readonly narrativas = new FormArray<FormControl<string>>([]);
  private readonly quantidadeDeNarrativas = signal(0);
  private readonly algumaPreenchida = signal(false);

  readonly executando = signal(false);
  readonly resultado = signal<PromptTestadoDto | null>(null);
  readonly erro = signal<string | null>(null);

  readonly nivel = computed<NivelIaEnum>(() => NIVEL_DO_TIPO_DE_PROMPT[this.tipo()]);
  readonly podeAdicionar = computed(() => this.quantidadeDeNarrativas() < this.limite);
  readonly podeTestar = computed(() => this.algumaPreenchida() && this.conteudo().trim() !== '' && !this.executando());

  constructor() {
    // Ao abrir (ou trocar de tipo), recarrega as narrativas guardadas daquele tipo e limpa o resultado anterior.
    effect(() => {
      if (!this.visivel()) return;
      const tipo = this.tipo();
      untracked(() => {
        this.carregarNarrativas(tipo);
        this.resultado.set(null);
        this.erro.set(null);
      });
    });
    this.narrativas.valueChanges.subscribe(() => this.aoMudarNarrativas());
  }

  adicionar(): void {
    if (this.podeAdicionar()) this.narrativas.push(new FormControl('', { nonNullable: true }));
    this.aoMudarNarrativas();
  }

  remover(indice: number): void {
    this.narrativas.removeAt(indice);
    if (this.narrativas.length === 0) this.narrativas.push(new FormControl('', { nonNullable: true }));
    this.aoMudarNarrativas();
  }

  /** Pede confirmação no nível analítico (o mais caro); nos outros roda direto. */
  testar(): void {
    if (!this.podeTestar()) return;
    const chamadas = this.narrativasPreenchidas().length * 2;
    if (this.nivel() !== NivelIaEnum.ANALITICO) {
      this.executar();
      return;
    }
    this.confirmationService.confirm({
      key: 'prompts-acao',
      header: 'Testar no nível analítico',
      message: `Este tipo roda no nível analítico (o mais caro): serão ${chamadas} chamadas à IA. Continuar?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Testar',
      rejectLabel: 'Cancelar',
      accept: () => this.executar(),
    });
  }

  private executar(): void {
    this.executando.set(true);
    this.resultado.set(null);
    this.erro.set(null);
    this.promptService.testar(this.tipo(), { conteudo: this.conteudo(), narrativas: this.narrativasPreenchidas() }).subscribe({
      next: (resposta) => {
        this.resultado.set(resposta.dados ?? null);
        this.executando.set(false);
      },
      error: (falha) => {
        this.erro.set(falha?.error?.mensagem ?? 'Não foi possível testar o prompt.');
        this.executando.set(false);
      },
    });
  }

  private narrativasPreenchidas(): string[] {
    return this.narrativas.controls.map((controle) => controle.value.trim()).filter((texto) => texto !== '');
  }

  private carregarNarrativas(tipo: TipoPromptEnum): void {
    let guardadas: string[] = [];
    try {
      const bruto = localStorage.getItem(CHAVE_NARRATIVAS + tipo);
      const lido: unknown = bruto ? JSON.parse(bruto) : [];
      if (Array.isArray(lido)) guardadas = lido.filter((item): item is string => typeof item === 'string').slice(0, this.limite);
    } catch {
      // Sem armazenamento ou conteúdo inválido: começa vazio.
    }
    this.narrativas.clear({ emitEvent: false });
    (guardadas.length > 0 ? guardadas : ['']).forEach((texto) => this.narrativas.push(new FormControl(texto, { nonNullable: true }), { emitEvent: false }));
    this.aoMudarNarrativas(false);
  }

  private aoMudarNarrativas(guardar = true): void {
    this.quantidadeDeNarrativas.set(this.narrativas.length);
    this.algumaPreenchida.set(this.narrativasPreenchidas().length > 0);
    if (!guardar) return;
    try {
      localStorage.setItem(CHAVE_NARRATIVAS + this.tipo(), JSON.stringify(this.narrativas.controls.map((controle) => controle.value)));
    } catch {
      // Sem armazenamento: o teste funciona, só não lembra as narrativas.
    }
  }
}
