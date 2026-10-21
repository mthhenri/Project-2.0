import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfiguracaoIaResumoDto, TipoProvedorIaEnum, cadeiaDeProvedoresIa } from '@project20/shared';
import { rotuloDoEsforco, rotuloDoModoContexto, rotuloDoProvedor } from '../../utils/configuracao-ia.util';

/**
 * Coluna fixa de histórico das Configurações da IA (task 204), à direita e independente da aba: lista as versões e abre o valor de uma por
 * vez em leitura. "Usar como base" só avisa a página, que preenche o formulário; nada é gravado.
 */
@Component({
  selector: 'app-historico-versoes',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, ButtonModule, TagModule],
  templateUrl: './historico-versoes.component.html',
  styleUrl: './historico-versoes.component.scss',
})
export class HistoricoVersoesComponent {
  readonly versoes = input.required<ConfiguracaoIaResumoDto[]>();
  readonly ativa = input.required<ConfiguracaoIaResumoDto | null>();
  readonly usarComoBase = output<ConfiguracaoIaResumoDto>();

  readonly rotuloDoEsforco = rotuloDoEsforco;
  readonly rotuloDoModoContexto = rotuloDoModoContexto;
  readonly rotuloDoProvedor = rotuloDoProvedor;

  private readonly idSelecionado = signal<number | null>(null);
  readonly selecionada = computed(() => this.versoes().find((versao) => versao.id === this.idSelecionado()) ?? null);

  constructor() {
    // Uma lista nova (depois de salvar ou recarregar) fecha o detalhe aberto.
    effect(() => {
      this.versoes();
      this.idSelecionado.set(null);
    });
  }

  selecionar(versao: ConfiguracaoIaResumoDto): void {
    this.idSelecionado.set(this.idSelecionado() === versao.id ? null : versao.id);
  }

  cadeiaDaVersao(versao: ConfiguracaoIaResumoDto): TipoProvedorIaEnum[] {
    return cadeiaDeProvedoresIa(versao);
  }

  usar(versao: ConfiguracaoIaResumoDto): void {
    this.idSelecionado.set(null);
    this.usarComoBase.emit(versao);
  }
}
