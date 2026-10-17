import { EsforcoIaEnum } from '@project20/shared';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { IaBloco, IaMensagem, IaMotivoParada, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';

/** O pedaço do cliente do SDK que o provedor usa (permite um cliente falso nos testes). */
export interface ClienteAnthropic {
  messages: {
    create(parametros: Record<string, unknown>): Promise<MensagemAnthropic>;
    stream(parametros: Record<string, unknown>): FluxoAnthropic;
  };
}

export interface FluxoAnthropic {
  on(evento: 'text', ouvinte: (trecho: string) => void): unknown;
  finalMessage(): Promise<MensagemAnthropic>;
}

export interface MensagemAnthropic {
  model: string;
  stop_reason?: string | null;
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null };
}

/** Esforço neutro do projeto → parâmetro `output_config.effort` da Anthropic. */
const ESFORCO_ANTHROPIC: Record<EsforcoIaEnum, string> = {
  [EsforcoIaEnum.BAIXO]: 'low',
  [EsforcoIaEnum.MEDIO]: 'medium',
  [EsforcoIaEnum.ALTO]: 'high',
};

const MOTIVOS_DE_PARADA: Record<string, IaMotivoParada> = {
  end_turn: 'fim',
  stop_sequence: 'fim',
  max_tokens: 'limite_de_tokens',
  tool_use: 'uso_ferramenta',
};

export class AnthropicProvedor implements IaProvedor {
  /** `cliente` é `null` quando não há chave de API no ambiente. */
  constructor(private readonly cliente: ClienteAnthropic | null) {}

  estaDisponivel(): boolean {
    return this.cliente !== null;
  }

  async gerar(solicitacao: IaSolicitacaoProvedor): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      return this.traduzirResposta(await cliente.messages.create(this.montarParametros(solicitacao)));
    } catch (erro) {
      throw this.traduzirErro(erro);
    }
  }

  async transmitir(solicitacao: IaSolicitacaoProvedor, aoTrecho: (trecho: string) => void): Promise<IaRespostaProvedor> {
    const cliente = this.exigirCliente();
    try {
      const fluxo = cliente.messages.stream(this.montarParametros(solicitacao));
      fluxo.on('text', aoTrecho);
      return this.traduzirResposta(await fluxo.finalMessage());
    } catch (erro) {
      throw this.traduzirErro(erro);
    }
  }

  private exigirCliente(): ClienteAnthropic {
    if (!this.cliente) throw new IaException('INDISPONIVEL', 'IA indisponível neste ambiente');
    return this.cliente;
  }

  private montarParametros(solicitacao: IaSolicitacaoProvedor): Record<string, unknown> {
    const parametros: Record<string, unknown> = {
      model: solicitacao.modelo,
      max_tokens: solicitacao.maximoTokens,
      messages: solicitacao.mensagens.map((mensagem) => this.traduzirMensagem(mensagem)),
    };
    if (solicitacao.instrucoes) parametros['system'] = solicitacao.instrucoes;
    if (solicitacao.ferramentas?.length) {
      parametros['tools'] = solicitacao.ferramentas.map((ferramenta) => ({
        name: ferramenta.nome,
        description: ferramenta.descricao,
        input_schema: ferramenta.esquemaEntrada,
      }));
    }
    if (solicitacao.esforco) parametros['output_config'] = { effort: ESFORCO_ANTHROPIC[solicitacao.esforco] };
    return parametros;
  }

  private traduzirMensagem(mensagem: IaMensagem): Record<string, unknown> {
    const role = mensagem.papel === 'usuario' ? 'user' : 'assistant';
    if (typeof mensagem.conteudo === 'string') return { role, content: mensagem.conteudo };
    return {
      role,
      content: mensagem.conteudo.map((bloco) => {
        switch (bloco.tipo) {
          case 'texto':
            return { type: 'text', text: bloco.texto };
          case 'uso_ferramenta':
            return { type: 'tool_use', id: bloco.id, name: bloco.nome, input: bloco.entrada };
          case 'resultado_ferramenta':
            return { type: 'tool_result', tool_use_id: bloco.usoId, content: bloco.conteudo, is_error: bloco.erro ?? false };
        }
      }),
    };
  }

  private traduzirResposta(mensagem: MensagemAnthropic): IaRespostaProvedor {
    const blocos: IaBloco[] = [];
    for (const bloco of mensagem.content) {
      if (bloco.type === 'text') blocos.push({ tipo: 'texto', texto: bloco.text ?? '' });
      if (bloco.type === 'tool_use') {
        blocos.push({ tipo: 'uso_ferramenta', id: bloco.id ?? '', nome: bloco.name ?? '', entrada: (bloco.input ?? {}) as Record<string, unknown> });
      }
    }
    return {
      texto: blocos.map((bloco) => (bloco.tipo === 'texto' ? bloco.texto : '')).join(''),
      blocos,
      modelo: mensagem.model,
      tokens: {
        entrada: mensagem.usage?.input_tokens ?? 0,
        saida: mensagem.usage?.output_tokens ?? 0,
        cache: mensagem.usage?.cache_read_input_tokens ?? 0,
      },
      motivoParada: MOTIVOS_DE_PARADA[mensagem.stop_reason ?? ''] ?? 'outro',
    };
  }

  /** Erro do SDK → exceção do projeto (pelo status HTTP, sem depender das classes do SDK). */
  private traduzirErro(erro: unknown): IaException {
    if (erro instanceof IaException) return erro;
    const status = (erro as { status?: number } | null)?.status;
    if (status === 429) return new IaException('LIMITE', 'Limite de uso da IA atingido');
    if (status === 401 || status === 403 || status === 404) {
      return new IaException('CONFIGURACAO', 'Configuração da IA inválida (chave ou modelo recusados pelo provedor)');
    }
    return new IaException('INDISPONIVEL', 'Serviço de IA temporariamente indisponível');
  }
}
