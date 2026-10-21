import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TipoProvedorIaEnum } from '@project20/shared';
import {
  FormularioConfiguracaoIa,
  OPCOES_ESFORCO,
  OPCOES_PROVEDOR,
  QUANTIDADE_DE_FALLBACKS,
  SUGESTOES_MODELOS,
  ValorFormularioConfiguracaoIa,
  cadeiaDoFormulario,
  camposDaCadeia,
  removerProvedorDoCartao,
  rotuloDoProvedor,
} from '../../utils/configuracao-ia.util';

interface Cartao {
  posicao: number;
  papel: string;
  provedor: TipoProvedorIaEnum | null;
  /** Só o primeiro cartão vazio aceita um provedor: a cadeia não tem buraco. */
  disponivel: boolean;
}

/**
 * Aba "Provedor e modelos" das Configurações da IA (task 204): a ordem de tentativa em cartões (padrão e até dois fallbacks, cada um com o
 * estado da chave de API) e, abaixo, os três modelos do provedor do cartão aberto. O esforço do nível analítico fica aqui. Quem tem o
 * formulário é a página; esta aba só o edita. Análogo visual: os cartões com borda da tela de Configurações da IA.
 */
@Component({
  selector: 'app-provedor-aba',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, SelectButtonModule, TagModule, TooltipModule],
  templateUrl: './provedor-aba.component.html',
  styleUrl: './provedor-aba.component.scss',
})
export class ProvedorAbaComponent {
  readonly formulario = input.required<FormularioConfiguracaoIa>();
  readonly valor = input.required<ValorFormularioConfiguracaoIa>();
  /** Provedores com chave de API no ambiente; `null` quando o estado não pôde ser lido (o cartão não afirma nada). */
  readonly provedoresComChave = input<TipoProvedorIaEnum[] | null>(null);
  /** Erros de provedor e modelo já filtrados pela página (só aparecem depois de uma tentativa de salvar). */
  readonly erros = input<string[]>([]);
  /** Os mesmos erros por provedor: marcam o cartão do provedor com problema, e o primeiro deles é aberto. */
  readonly errosPorProvedor = input<Partial<Record<TipoProvedorIaEnum, string[]>>>({});

  readonly opcoesEsforco = OPCOES_ESFORCO;
  readonly rotuloDoProvedor = rotuloDoProvedor;

  /** Posição (0 = padrão) do cartão cujos modelos estão abertos. */
  private readonly posicaoEscolhida = signal(0);

  readonly cadeia = computed(() => cadeiaDoFormulario(this.valor()));

  /** O cartão aberto nunca aponta para uma posição que deixou de existir (depois de remover um fallback). */
  readonly posicaoAberta = computed(() => Math.min(this.posicaoEscolhida(), this.cadeia().length - 1));
  readonly provedorAberto = computed(() => this.cadeia()[this.posicaoAberta()]);

  constructor() {
    // Quando os erros aparecem (ao tentar salvar), abre o primeiro cartão com problema; escolher outro cartão depois não é desfeito.
    effect(() => {
      const comErro = this.cadeia().flatMap((provedor, posicao) => (this.errosPorProvedor()[provedor] ? [posicao] : []));
      untracked(() => {
        if (comErro.length > 0 && !comErro.includes(this.posicaoAberta())) this.posicaoEscolhida.set(comErro[0]);
      });
    });
  }

  readonly cartoes = computed<Cartao[]>(() => {
    const cadeia = this.cadeia();
    return Array.from({ length: QUANTIDADE_DE_FALLBACKS + 1 }, (_, posicao) => ({
      posicao,
      papel: posicao === 0 ? 'Padrão' : `${posicao}º fallback`,
      provedor: cadeia[posicao] ?? null,
      disponivel: posicao <= cadeia.length,
    }));
  });

  /** O controle do formulário que guarda o provedor de cada cartão (padrão, 1º e 2º fallback). */
  controleDoCartao(posicao: number): FormControl<TipoProvedorIaEnum | null> {
    const { provedor, fallbackPrimeiro, fallbackSegundo } = this.formulario().controls;
    return [provedor, fallbackPrimeiro, fallbackSegundo][posicao] as FormControl<TipoProvedorIaEnum | null>;
  }

  /** As opções de um cartão: os provedores já usados em outro cartão ficam desabilitados. */
  opcoesDoCartao(posicao: number) {
    const cadeia = this.cadeia();
    return OPCOES_PROVEDOR.map((opcao) => ({ ...opcao, desabilitada: cadeia.some((usado, indice) => usado === opcao.valor && indice !== posicao) }));
  }

  temErro(provedor: TipoProvedorIaEnum): boolean {
    return !!this.errosPorProvedor()[provedor];
  }

  /** `true`/`false` conforme a chave do provedor está no ambiente; `null` se não se sabe. */
  temChave(provedor: TipoProvedorIaEnum): boolean | null {
    const comChave = this.provedoresComChave();
    return comChave === null ? null : comChave.includes(provedor);
  }

  abrir(posicao: number): void {
    this.posicaoEscolhida.set(posicao);
  }

  /** Tira o fallback do cartão: o seguinte sobe um lugar (a cadeia continua sem buraco). */
  removerFallback(posicao: number): void {
    this.formulario().patchValue(camposDaCadeia(removerProvedorDoCartao(this.cadeia(), posicao)));
  }

  sugestoesDe(provedor: TipoProvedorIaEnum): readonly string[] {
    return SUGESTOES_MODELOS[provedor];
  }
}
