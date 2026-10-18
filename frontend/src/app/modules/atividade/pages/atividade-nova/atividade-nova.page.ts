import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AtividadeFormularioComponent } from '../../components/atividade-formulario/atividade-formulario.component';

/**
 * Rota `/atividade/nova` (deep-link, aceita `?demandaId=`): hospeda o mesmo formulário do dialog de nova atividade, com os mesmos
 * campos e defaults. Ao criar, volta para a listagem (da demanda, quando veio de uma); "Salvar e criar outra" fica na página.
 */
@Component({
  selector: 'app-atividade-nova',
  standalone: true,
  imports: [ButtonModule, AtividadeFormularioComponent],
  templateUrl: './atividade-nova.page.html',
  styleUrl: './atividade-nova.page.scss',
})
export class AtividadeNovaPage {
  private readonly router = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);

  private readonly formulario = viewChild.required(AtividadeFormularioComponent);

  /** `?demandaId=` inválido ou ausente vira `null`: o seletor de demanda fica vazio e focado. */
  readonly demandaId: number | null = (() => {
    const valor = Number(this.rotaAtiva.snapshot.queryParamMap.get('demandaId'));
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  })();

  salvando(): boolean {
    return this.formulario().salvando();
  }

  salvar(criarOutra = false): void {
    this.formulario().salvar(criarOutra);
  }

  /** Enter no campo de nome cria (no dialog quem faz isso é a diretiva `dialogFormulario`; a página não tem diálogo). */
  aoTeclarEnter(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    if (alvo.tagName !== 'INPUT' || alvo.type !== 'text' || alvo.readOnly) return;
    evento.preventDefault();
    this.salvar();
  }

  aoCriar(criarOutra: boolean): void {
    if (!criarOutra) this.voltar();
  }

  voltar(): void {
    this.router.navigate(['/atividade'], { queryParams: this.demandaId ? { demandaId: this.demandaId } : {} });
  }
}
