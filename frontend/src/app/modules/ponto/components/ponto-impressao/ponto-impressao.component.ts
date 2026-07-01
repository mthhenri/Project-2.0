import { Component, Input, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PontoMensalDto } from '@project20/shared';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { formatarSaldoMinutos, abreviacaoDiaSemana, numeroDoDia } from '../../models/ponto.model';

/**
 * Folha imprimível do espelho de ponto mensal de um usuário. Fica oculta na tela e só
 * aparece na impressão (`@media print`, ver SCSS local + regra global em styles.scss).
 * Reaproveita os dados já carregados em `mensal`; busca apenas cargo e jornada do usuário
 * para o cabeçalho antes de acionar `window.print()`.
 */
@Component({
  selector: 'app-ponto-impressao',
  standalone: true,
  imports: [DatePipe, MinutosParaHorasPipe],
  templateUrl: './ponto-impressao.component.html',
  styleUrl: './ponto-impressao.component.scss',
})
export class PontoImpressaoComponent {
  @Input() mensal: PontoMensalDto | null = null;
  /** Nome do gestor logado (assinatura do responsável pela impressão). */
  @Input() nomeGestor = '';

  private readonly usuarioService = inject(UsuarioService);

  readonly cargoUsuario = signal<string>('');
  readonly jornadaDiaria = signal<number | null>(null);

  /** Busca cargo/jornada do usuário e então abre o diálogo de impressão do navegador. */
  imprimir(): void {
    const mensal = this.mensal;
    if (!mensal) return;

    this.usuarioService.recuperar(mensal.usuarioId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.cargoUsuario.set(resposta.dados.cargoTitulo);
          this.jornadaDiaria.set(resposta.dados.horasDiariasNecessarias);
        }
        // Deixa o change detection aplicar os signals no DOM antes de imprimir.
        setTimeout(() => window.print(), 0);
      },
      error: () => setTimeout(() => window.print(), 0),
    });
  }

  nomeMes(mes: number): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return meses[mes - 1] ?? '';
  }

  abreviacao(dataIso: string): string {
    return abreviacaoDiaSemana(dataIso);
  }

  numero(dataIso: string): number {
    return numeroDoDia(dataIso);
  }

  formatarSaldo(saldoMinutos: number): string {
    return formatarSaldoMinutos(saldoMinutos);
  }

  /** Converte minutos cobertos pela justificativa em horas legíveis (ex.: "4h"). */
  horasCobertas(minutos: number | null): string {
    if (minutos === null) return '';
    const horas = minutos / 60;
    return Number.isInteger(horas) ? `${horas}h` : `${horas.toFixed(1)}h`;
  }
}
