import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import {
  EXTENSOES_DE_ARQUIVO_DA_FONTE,
  LIMITE_CONTEUDO_DA_FONTE_DO_PLANO,
  LIMITE_FONTES_POR_PLANO,
  LIMITE_TITULO_DA_FONTE_DO_PLANO,
  PlanoFonteResumoDto,
  TAMANHO_MAXIMO_DO_ARQUIVO_DA_FONTE_BYTES,
  TipoPlanoFonteOrigemEnum,
  temExtensaoAceitaDeFonte,
  validarFonteDoPlano,
} from '@project20/shared';
import { PlanoService } from '../../services/plano.service';

/**
 * Painel das fontes do plano (task 236): o material de fora (e-mail colado, arquivo `.txt` ou `.md`) que a IA usa ao planejar. Só texto: o arquivo é
 * lido aqui e só o texto vai ao servidor. A regra de validação é a do `shared`, a mesma da service. Ver abre o conteúdo na própria lista; remover
 * pede confirmação e é soft delete (a fonte some do contexto da IA). Análogo visual: o painel dos pontos em aberto (235).
 */
@Component({
  selector: 'app-plano-fontes',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TextareaModule, TooltipModule],
  templateUrl: './plano-fontes.component.html',
  styleUrl: './plano-fontes.component.scss',
})
export class PlanoFontesComponent {
  readonly planoId = input.required<number>();
  /** O painel aberto ou recolhido (aberto por padrão); o documento lê para dar o espaço ao texto. */
  readonly aberto = model(true);

  private readonly planoService = inject(PlanoService);
  private readonly messageService = inject(MessageService);

  readonly Origem = TipoPlanoFonteOrigemEnum;
  readonly limiteConteudo = LIMITE_CONTEUDO_DA_FONTE_DO_PLANO;
  readonly limiteTitulo = LIMITE_TITULO_DA_FONTE_DO_PLANO;
  readonly limiteDeFontes = LIMITE_FONTES_POR_PLANO;
  readonly extensoesAceitas = EXTENSOES_DE_ARQUIVO_DA_FONTE.join(',');

  readonly fontes = signal<PlanoFonteResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly ocupado = signal(false);
  readonly colando = signal(false);
  /** A fonte aberta para leitura, com o conteúdo já trazido. */
  readonly vendo = signal<{ id: number; conteudo: string } | null>(null);
  /** A fonte que espera a confirmação de remoção. */
  readonly removendo = signal<number | null>(null);

  readonly noLimite = computed(() => this.fontes().length >= LIMITE_FONTES_POR_PLANO);

  readonly controleTitulo = new FormControl<string>('', { nonNullable: true });
  readonly controleConteudo = new FormControl<string>('', { nonNullable: true });

  constructor() {
    effect(() => {
      const id = this.planoId();
      untracked(() => this.recarregar(id));
    });
  }

  recarregar(id: number = this.planoId()): void {
    if (this.fontes().length === 0) this.carregando.set(true);
    this.erro.set(false);
    this.planoService.listarFontes(id).subscribe({
      next: (resposta) => {
        if (id !== this.planoId()) return;
        this.fontes.set(resposta.dados ?? []);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  alternarColagem(): void {
    this.colando.update((atual) => !atual);
    this.controleTitulo.setValue('');
    this.controleConteudo.setValue('');
  }

  /** Grava o texto colado; sem título, vale "Texto colado". */
  adicionarColado(): void {
    const titulo = this.controleTitulo.value.trim() || 'Texto colado';
    this.enviar(titulo, this.controleConteudo.value, TipoPlanoFonteOrigemEnum.COLADO, () => this.colando.set(false));
  }

  /** Lê o arquivo escolhido como texto e o envia. Recusa antes de ler o que não é `.txt`/`.md` e o que é grande demais. */
  async anexarArquivo(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo) return;
    if (!temExtensaoAceitaDeFonte(arquivo.name)) return this.avisar(`Só arquivos de texto são aceitos (${EXTENSOES_DE_ARQUIVO_DA_FONTE.join(' e ')})`);
    if (arquivo.size > TAMANHO_MAXIMO_DO_ARQUIVO_DA_FONTE_BYTES) return this.avisar(`O arquivo é grande demais: o texto deve ter no máximo ${LIMITE_CONTEUDO_DA_FONTE_DO_PLANO} caracteres`);
    this.enviar(arquivo.name, await arquivo.text(), TipoPlanoFonteOrigemEnum.ARQUIVO);
  }

  /** Alterna a leitura de uma fonte: traz o conteúdo na primeira vez. */
  ver(fonte: PlanoFonteResumoDto): void {
    if (this.vendo()?.id === fonte.id) {
      this.vendo.set(null);
      return;
    }
    this.planoService.recuperarFonte(this.planoId(), fonte.id).subscribe({
      next: (resposta) => this.vendo.set({ id: fonte.id, conteudo: resposta.dados?.conteudo ?? '' }),
      error: (falha: HttpErrorResponse) => this.avisar(falha.error?.mensagem ?? 'Não foi possível abrir a fonte'),
    });
  }

  pedirRemocao(fonte: PlanoFonteResumoDto): void {
    this.removendo.set(fonte.id);
  }

  cancelarRemocao(): void {
    this.removendo.set(null);
  }

  remover(fonte: PlanoFonteResumoDto): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.planoService.excluirFonte(this.planoId(), fonte.id).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.removendo.set(null);
        if (this.vendo()?.id === fonte.id) this.vendo.set(null);
        this.recarregar();
      },
      error: (falha: HttpErrorResponse) => this.falhar(falha, 'Não foi possível remover a fonte'),
    });
  }

  private enviar(titulo: string, conteudo: string, origem: TipoPlanoFonteOrigemEnum, aoGravar?: () => void): void {
    if (this.ocupado()) return;
    const problema = validarFonteDoPlano({ titulo, conteudo, origem });
    if (problema) return this.avisar(problema);
    this.ocupado.set(true);
    this.planoService.criarFonte(this.planoId(), titulo, conteudo, origem).subscribe({
      next: () => {
        this.ocupado.set(false);
        aoGravar?.();
        this.recarregar();
      },
      error: (falha: HttpErrorResponse) => this.falhar(falha, 'Não foi possível adicionar a fonte'),
    });
  }

  private avisar(detalhe: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Fonte do plano', detail: detalhe });
  }

  private falhar(falha: HttpErrorResponse, mensagemPadrao: string): void {
    this.ocupado.set(false);
    this.avisar(falha.error?.mensagem ?? mensagemPadrao);
  }
}
