import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import {
  AvisoNaTela,
  EntradaDaDecisaoDeAviso,
  OpcaoDeSilencio,
  PreferenciaNaTela,
  decidirAviso,
  normalizarPreferencia,
  silenciarAte,
  somarAviso,
} from '../utils/avisos.util';
import { MensagemDiretaService } from './mensagem-direta.service';
import { MensagemDiretaSomService } from './mensagem-direta-som.service';

/** O que o estado sabe de uma mensagem nova e entrega para este serviço decidir se avisa. */
export interface MensagemParaAvisar extends Omit<EntradaDaDecisaoDeAviso, 'preferencia' | 'agora'> {
  conversaId: string;
  usuarioId: number;
  usuarioNome: string;
  /** A prévia da mensagem, sem marcação. */
  texto: string;
}

/**
 * Os avisos de mensagem nova (task 212): as preferências do usuário (avisos, som, silêncio geral), os cartões que estão na tela e o som. Quem decide
 * **quando** avisar é a regra pura `decidirAviso`; aqui ficam o estado e a gravação. O estado do chat entrega os fatos (a conversa está silenciada, está à
 * vista, a mensagem cita o usuário) e não depende deste serviço para mais nada.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaAvisosService {
  private readonly api = inject(MensagemDiretaService);
  private readonly som = inject(MensagemDiretaSomService);

  readonly preferencia = signal<PreferenciaNaTela>(normalizarPreferencia(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA));
  /** A última gravação da preferência falhou (a tela voltou ao valor anterior). */
  readonly erroNaPreferencia = signal(false);
  readonly avisos = signal<AvisoNaTela[]>([]);

  private geracaoDaSessao = 0;
  private geracaoDaGravacao = 0;
  /** O servidor já respondeu com a preferência gravada. Sem isso, gravar levaria o padrão por cima da escolha do usuário. */
  private carregada = false;
  /** O último valor que o servidor confirmou: é para ele que a tela volta quando uma gravação falha. */
  private confirmada: PreferenciaNaTela = normalizarPreferencia(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);

  async carregarPreferencia(): Promise<void> {
    const sessao = this.geracaoDaSessao;
    const gravacoes = this.geracaoDaGravacao;
    try {
      const resposta = await firstValueFrom(this.api.recuperarPreferencia());
      if (sessao !== this.geracaoDaSessao || !resposta.dados) return;
      this.carregada = true;
      this.confirmada = normalizarPreferencia(resposta.dados);
      // Uma gravação feita enquanto a leitura voava é mais nova que ela: a tela fica com a gravação.
      if (gravacoes === this.geracaoDaGravacao) this.preferencia.set(this.confirmada);
    } catch {
      // Sem a preferência gravada vale o padrão nos avisos (melhor avisar do que calar por engano); gravar espera uma nova leitura.
    }
  }

  /**
   * Grava a mudança: a tela muda na hora e volta ao valor anterior se o servidor recusar. O pedido leva o conjunto inteiro (a rota troca tudo de uma
   * vez), então cada gravação parte da preferência que a tela mostra.
   */
  async alterarPreferencia(alteracao: Partial<PreferenciaNaTela>): Promise<void> {
    if (!this.carregada) await this.carregarPreferencia();
    if (!this.carregada) {
      this.erroNaPreferencia.set(true);
      return;
    }
    const proxima: PreferenciaNaTela = { ...this.preferencia(), ...alteracao };
    const geracao = ++this.geracaoDaGravacao;
    const sessao = this.geracaoDaSessao;
    this.preferencia.set(proxima);
    this.erroNaPreferencia.set(false);
    try {
      const resposta = await firstValueFrom(
        this.api.alterarPreferencia({
          avisosAtivos: proxima.avisosAtivos,
          avisoDesktopAtivo: proxima.avisoDesktopAtivo,
          somAtivo: proxima.somAtivo,
          silenciadoAteDate: proxima.silenciadoAteDate ? proxima.silenciadoAteDate.toISOString() : null,
          atalhoGlobal: proxima.atalhoGlobal,
        }),
      );
      if (sessao !== this.geracaoDaSessao) return;
      if (resposta.dados) this.confirmada = normalizarPreferencia(resposta.dados);
      // Havendo uma gravação mais nova em voo, a tela é dela; esta só atualiza o que o servidor confirmou.
      if (geracao === this.geracaoDaGravacao) this.preferencia.set(this.confirmada);
    } catch {
      if (sessao !== this.geracaoDaSessao || geracao !== this.geracaoDaGravacao) return;
      this.preferencia.set(this.confirmada);
      this.erroNaPreferencia.set(true);
    }
  }

  silenciarTudo(opcao: OpcaoDeSilencio): Promise<void> {
    return this.alterarPreferencia({ silenciadoAteDate: silenciarAte(opcao, new Date(), ambiente.fusoHorario) });
  }

  reativarTudo(): Promise<void> {
    return this.alterarPreferencia({ silenciadoAteDate: null });
  }

  /** Mostra o aviso (e toca o som, se ligado) quando a regra manda. Devolve se avisou. */
  avisar(mensagem: MensagemParaAvisar): boolean {
    const agora = new Date();
    const decisao = decidirAviso({ ...mensagem, preferencia: this.preferencia(), agora });
    if (!decisao.avisar) return false;
    this.avisos.update((atuais) =>
      somarAviso(atuais, {
        conversaId: mensagem.conversaId,
        usuarioId: mensagem.usuarioId,
        usuarioNome: mensagem.usuarioNome,
        texto: mensagem.texto,
        mencionaVoce: mensagem.mencionaVoce,
        agora: agora.getTime(),
      }),
    );
    if (this.preferencia().somAtivo) this.som.tocar();
    return true;
  }

  fechar(id: string): void {
    this.avisos.update((atuais) => atuais.filter((aviso) => aviso.id !== id));
  }

  /** A sessão acabou: nada do usuário anterior fica (preferência, cartões e gravações em voo). */
  limpar(): void {
    this.geracaoDaSessao++;
    this.avisos.set([]);
    this.carregada = false;
    this.confirmada = normalizarPreferencia(PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);
    this.preferencia.set(this.confirmada);
    this.erroNaPreferencia.set(false);
  }
}
