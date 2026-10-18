import { Component, computed, input, output, viewChild } from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto } from '@project20/shared';

export type CampoDocumentoDaDemanda = 'descricaoCliente' | 'descricaoTecnica' | 'documentacao';

interface Documento {
  campo: CampoDocumentoDaDemanda;
  rotulo: string;
  tipo: 'cliente' | 'tecnica' | 'doc';
}

const DOCUMENTOS: readonly Documento[] = [
  { campo: 'descricaoCliente', rotulo: 'Descrição do cliente', tipo: 'cliente' },
  { campo: 'descricaoTecnica', rotulo: 'Descrição técnica', tipo: 'tecnica' },
  { campo: 'documentacao', rotulo: 'Documentação', tipo: 'doc' },
];

/**
 * Um só ícone de documentos por linha (no lugar de três botões): os pontinhos coloridos mostram quais textos a demanda tem e o clique abre
 * um popover nomeando cada um. Sem nenhum, o ícone fica apagado.
 */
@Component({
  selector: 'app-atividade-documentos-indicador',
  standalone: true,
  imports: [PopoverModule, TooltipModule],
  templateUrl: './atividade-documentos-indicador.component.html',
  styleUrl: './atividade-documentos-indicador.component.scss',
})
export class AtividadeDocumentosIndicadorComponent {
  readonly atividade = input.required<AtividadeResumoDto>();
  readonly abrir = output<CampoDocumentoDaDemanda>();

  private readonly popover = viewChild.required<Popover>('popover');

  /** Os textos que a demanda tem, na ordem cliente, técnica, documentação. */
  readonly existentes = computed<Documento[]>(() => {
    const atividade = this.atividade();
    const tem: Record<CampoDocumentoDaDemanda, boolean> = {
      descricaoCliente: atividade.demandaTemDescricaoCliente,
      descricaoTecnica: atividade.demandaTemDescricaoTecnica,
      documentacao: atividade.demandaTemDocumentacao,
    };
    return DOCUMENTOS.filter((documento) => tem[documento.campo]);
  });

  readonly dica = computed(() => {
    const nomes = this.existentes().map((documento) => documento.rotulo);
    return nomes.length > 0 ? nomes.join(' · ') : 'A demanda não tem descrições nem documentação';
  });

  alternar(evento: Event): void {
    if (this.existentes().length === 0) return;
    this.popover().toggle(evento);
  }

  escolher(documento: Documento): void {
    this.popover().hide();
    this.abrir.emit(documento.campo);
  }
}
