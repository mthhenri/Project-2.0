import { Injectable } from '@nestjs/common';
import { PesquisaWebResultadoDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';

/** Um buscador da internet. A ferramenta da IA só conhece este contrato; trocar o serviço de busca é trocar a implementação. */
export abstract class BuscaWeb {
  /** Tem o que precisa para buscar (a chave da API)? */
  abstract disponivel(): boolean;
  abstract buscar(consulta: string, quantidade: number): Promise<PesquisaWebResultadoDto[]>;
}

const ENDERECO_BRAVE = 'https://api.search.brave.com/res/v1/web/search';
const PRAZO_MS = 8_000;
const LIMITE_TRECHO = 400;

interface RespostaHttp {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

interface RespostaBrave {
  web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
}

/** Brave Search API (`X-Subscription-Token`). Falha de rede, prazo ou recusa viram um erro de negócio que o modelo lê e explica. */
@Injectable()
export class BuscaWebBrave extends BuscaWeb {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  disponivel(): boolean {
    return !!this.configService.obter().buscaWeb.chave;
  }

  async buscar(consulta: string, quantidade: number): Promise<PesquisaWebResultadoDto[]> {
    const chave = this.configService.obter().buscaWeb.chave;
    if (!chave) throw new BusinessException('A pesquisa na internet não está configurada neste ambiente.');

    const url = `${ENDERECO_BRAVE}?${new URLSearchParams({ q: consulta, count: String(quantidade) }).toString()}`;
    let resposta: RespostaHttp;
    try {
      resposta = await this.requisitar(url, { Accept: 'application/json', 'X-Subscription-Token': chave });
    } catch {
      throw new BusinessException('A pesquisa na internet não respondeu a tempo. Responda sem ela e diga isso ao usuário.');
    }
    if (!resposta.ok) throw new BusinessException(`A pesquisa na internet foi recusada (HTTP ${resposta.status}). Responda sem ela e diga isso ao usuário.`);

    const corpo = (await resposta.json()) as RespostaBrave;
    return (corpo.web?.results ?? [])
      .filter((resultado) => resultado.url && resultado.title)
      .slice(0, quantidade)
      .map((resultado) => ({
        titulo: this.limpar(resultado.title!),
        url: resultado.url!,
        trecho: this.limpar(resultado.description ?? '').slice(0, LIMITE_TRECHO),
      }));
  }

  /** Separado para os testes não precisarem de rede. */
  protected requisitar(url: string, cabecalhos: Record<string, string>): Promise<RespostaHttp> {
    return fetch(url, { headers: cabecalhos, signal: AbortSignal.timeout(PRAZO_MS) });
  }

  /** O Brave devolve realces em HTML (`<strong>`) e entidades; a IA lê texto puro. */
  private limpar(texto: string): string {
    return texto
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
