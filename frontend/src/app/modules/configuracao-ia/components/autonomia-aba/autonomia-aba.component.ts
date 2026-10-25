import { Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { PropostaIaNivelEnum } from '@project20/shared';
import { FormularioConfiguracaoIa, ValorFormularioConfiguracaoIa } from '../../utils/configuracao-ia.util';
import { EXPLICACAO_DOS_NIVEIS, OPCOES_DE_NIVEL, REGRAS_DE_AUTONOMIA, REGRAS_FIXAS_DE_AUTONOMIA } from '../../utils/autonomia.util';

/**
 * Aba "Autonomia" das Configurações da IA (task 228): para cada ação que a IA propõe, o administrador escolhe se ela **faz e avisa** (executa na
 * hora e deixa uma linha com Desfazer) ou **pergunta** (espera o cartão). O que mexe em horas, em projeto, no ponto, na seção Pessoal do pad ou
 * em outra pessoa fica fixo, com um escudo e o motivo, fora da escolha. Quem tem o formulário é a página; esta aba só o edita.
 */
@Component({
  selector: 'app-autonomia-aba',
  standalone: true,
  imports: [ReactiveFormsModule, SelectButtonModule, TooltipModule],
  templateUrl: './autonomia-aba.component.html',
  styleUrl: './autonomia-aba.component.scss',
})
export class AutonomiaAbaComponent {
  readonly formulario = input.required<FormularioConfiguracaoIa>();
  readonly valor = input.required<ValorFormularioConfiguracaoIa>();

  readonly Nivel = PropostaIaNivelEnum;
  readonly opcoes = OPCOES_DE_NIVEL;
  readonly explicacao = EXPLICACAO_DOS_NIVEIS;
  readonly regras = REGRAS_DE_AUTONOMIA;
  readonly regrasFixas = REGRAS_FIXAS_DE_AUTONOMIA;

  /** Quantas regras estão em "Faz e avisa" agora: o resumo do alto da aba. */
  readonly quantasFazemEAvisam = computed(
    () => this.regras.filter((regra) => this.valor().niveisProposta[regra.chave] === PropostaIaNivelEnum.FAZ_E_AVISA).length,
  );
}
