import { Component, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { AtividadeResumoDto } from '@project20/shared';

export type CampoDocumentoDaDemanda = 'descricaoCliente' | 'descricaoTecnica' | 'documentacao';

interface Documento {
  campo: CampoDocumentoDaDemanda;
  rotulo: string;
  tipo: 'cliente' | 'tecnica' | 'doc';
  icone: string;
}

const DOCUMENTOS: readonly Documento[] = [
  { campo: 'descricaoCliente', rotulo: 'Descrição do cliente', tipo: 'cliente', icone: 'pi-user' },
  { campo: 'descricaoTecnica', rotulo: 'Descrição técnica', tipo: 'tecnica', icone: 'pi-code' },
  { campo: 'documentacao', rotulo: 'Documentação', tipo: 'doc', icone: 'pi-book' },
];

/**
 * Os três ícones de texto da demanda (cliente, técnica, documentação), um por tipo: o padrão visual do projeto para diferenciá-los.
 * Acesos (cor da família, negrito e brilho) quando a demanda tem o texto; apagados quando não tem. O clique abre o texto.
 */
@Component({
  selector: 'app-atividade-documentos-indicador',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './atividade-documentos-indicador.component.html',
  styleUrl: './atividade-documentos-indicador.component.scss',
})
export class AtividadeDocumentosIndicadorComponent {
  readonly atividade = input.required<AtividadeResumoDto>();
  readonly abrir = output<CampoDocumentoDaDemanda>();

  readonly documentos = DOCUMENTOS;

  temConteudo(campo: CampoDocumentoDaDemanda): boolean {
    const atividade = this.atividade();
    return campo === 'descricaoCliente' ? atividade.demandaTemDescricaoCliente
      : campo === 'descricaoTecnica' ? atividade.demandaTemDescricaoTecnica
      : atividade.demandaTemDocumentacao;
  }
}
