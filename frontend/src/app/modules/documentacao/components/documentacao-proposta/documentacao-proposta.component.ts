import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DiffPorPalavraComponent } from '../../../../shared/components/diff-por-palavra/diff-por-palavra.component';

/** Em que ponto está o pedido de alteração de um trecho (task 260). */
export type EstadoDaProposta = 'PEDINDO' | 'PRONTA' | 'ERRO' | 'EXPIRADA';

/**
 * O cartão "Proposta da IA · só o trecho marcado", abaixo do bloco (task 260): o diff por palavra do bloco com a seleção alterada, com Aceitar,
 * Descartar e Pedir de novo. Pedindo mostra um carregamento discreto; erro oferece "Tentar de novo"; expirada avisa que o texto mudou e o bloco não
 * está mais lá. Aceitar não grava: troca o bloco no editor e a aba fica como "Alterações sem gravar".
 */
@Component({
  selector: 'app-documentacao-proposta',
  standalone: true,
  imports: [ButtonModule, DiffPorPalavraComponent],
  templateUrl: './documentacao-proposta.component.html',
  styleUrl: './documentacao-proposta.component.scss',
})
export class DocumentacaoPropostaComponent {
  readonly estado = input.required<EstadoDaProposta>();
  readonly bloco = input('');
  readonly blocoNovo = input('');
  readonly mensagemDeErro = input('');

  readonly aceitar = output<void>();
  readonly descartar = output<void>();
  readonly pedirDeNovo = output<void>();
  readonly tentarDeNovo = output<void>();
}
