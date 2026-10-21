import { Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
  EXPLICACAO_MODO_CONTEXTO,
  FormularioConfiguracaoIa,
  OPCOES_MODO_CONTEXTO,
  ValorFormularioConfiguracaoIa,
} from '../../utils/configuracao-ia.util';

/**
 * Aba "Comportamento" das Configurações da IA (task 204): o check-in e o rigor (minutos, interruptores) e o chat (dúvidas de código e
 * contexto). Eram seções da aba "Provedor e modelos". Quem tem o formulário é a página; esta aba só o edita.
 */
@Component({
  selector: 'app-comportamento-aba',
  standalone: true,
  imports: [ReactiveFormsModule, InputNumberModule, SelectModule, ToggleSwitchModule],
  templateUrl: './comportamento-aba.component.html',
  styleUrl: './comportamento-aba.component.scss',
})
export class ComportamentoAbaComponent {
  readonly formulario = input.required<FormularioConfiguracaoIa>();
  readonly valor = input.required<ValorFormularioConfiguracaoIa>();
  /** Os erros dos campos só aparecem depois de tocar neles ou de uma tentativa de salvar. */
  readonly tentouSalvar = input<boolean>(false);

  readonly opcoesModoContexto = OPCOES_MODO_CONTEXTO;
  readonly explicacaoDoModoEscolhido = computed(() => EXPLICACAO_MODO_CONTEXTO[this.valor().modoContextoChat]);

  campoInvalido(nome: 'checkinMinimoMinutos' | 'checkinMaximoMinutos' | 'duracaoRecomendadaMinutos'): boolean {
    const controle = this.formulario().controls[nome];
    return controle.invalid && (controle.touched || this.tentouSalvar());
  }

  intervaloInvalido(): boolean {
    const formulario = this.formulario();
    return formulario.hasError('intervaloInvalido') && (this.tentouSalvar() || formulario.controls.checkinMaximoMinutos.touched);
  }
}
