import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IaDisponibilidadeService } from '../../../core/services/ia-disponibilidade.service';

/**
 * O aviso "A IA voltou" (task 158): uma faixa discreta, sem interromper o que o usuário faz, que pergunta se ele quer voltar para o chat.
 * "Voltar para a IA" leva ao chat, que retoma a conversa do dia; "Agora não" mantém as telas convencionais (e deixa o botão "Voltar
 * para a IA" na barra superior).
 */
@Component({
  selector: 'app-ia-retorno-aviso',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './ia-retorno-aviso.component.html',
  styleUrl: './ia-retorno-aviso.component.scss',
})
export class IaRetornoAvisoComponent {
  protected readonly disponibilidade = inject(IaDisponibilidadeService);
  private readonly roteador = inject(Router);

  voltar(): void {
    this.disponibilidade.voltarParaAIa();
    void this.roteador.navigateByUrl('/chat');
  }

  agoraNao(): void {
    this.disponibilidade.agoraNao();
  }
}
