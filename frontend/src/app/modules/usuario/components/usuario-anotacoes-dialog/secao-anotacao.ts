import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { signal } from '@angular/core';
import { AnotacaoResumoDto, TipoAnotacaoEnum } from '@project20/shared';
import { anotacaoTemTexto } from '../../utils/anotacoes.util';

export type EstadoSalvamento = 'ocioso' | 'editando' | 'salvando' | 'salvo' | 'erro';

/**
 * Uma seção do pad dentro do drawer: o campo do editor, a versão lida do servidor (`updatedDate`, que
 * volta no PUT para detectar conflito) e o que o salvamento automático precisa para andar sozinho.
 * Cada seção salva por conta própria, com o `usuarioId` de quando foi lida — assim uma seção que ficou
 * para trás (o drawer abriu o pad de outra pessoa) ainda grava no dono certo.
 */
export class SecaoAnotacao {
  readonly controle = new FormControl('', { nonNullable: true });
  readonly estado = signal<EstadoSalvamento>('ocioso');
  readonly salvoEm = signal<Date | null>(null);
  /** O editor tem algo além de espaços (o cabeçalho do acordeão mostra isso). */
  readonly temTexto = signal(false);

  versaoLida: Date | string;
  conteudoSalvo: string;
  temporizadorSalvar: ReturnType<typeof setTimeout> | null = null;
  salvandoRequisicao = false;
  salvarDeNovo = false;
  /** Conteúdo que existia antes do "Limpar", enquanto a janela do Desfazer está aberta. */
  conteudoAntesDeLimpar: string | null = null;
  assinatura: Subscription | null = null;

  constructor(
    readonly usuarioId: number,
    readonly tipo: TipoAnotacaoEnum,
    lida: AnotacaoResumoDto,
  ) {
    this.versaoLida = lida.updatedDate;
    this.conteudoSalvo = lida.texto;
    this.controle.setValue(lida.texto, { emitEvent: false });
    this.temTexto.set(anotacaoTemTexto(lida.texto));
  }

  get textoAtual(): string {
    return this.controle.value;
  }

  get limpando(): boolean {
    return this.conteudoAntesDeLimpar !== null;
  }

  /** Aceita a versão do servidor no lugar do que estava na tela (recarga após conflito). */
  adotar(lida: AnotacaoResumoDto): void {
    this.versaoLida = lida.updatedDate;
    this.conteudoSalvo = lida.texto;
    this.controle.setValue(lida.texto, { emitEvent: false });
    this.temTexto.set(anotacaoTemTexto(lida.texto));
  }

  cancelarAgendamento(): void {
    if (this.temporizadorSalvar !== null) clearTimeout(this.temporizadorSalvar);
    this.temporizadorSalvar = null;
  }

  encerrar(): void {
    this.cancelarAgendamento();
    this.assinatura?.unsubscribe();
    this.assinatura = null;
  }
}
