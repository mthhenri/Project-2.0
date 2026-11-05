import { IaModeloListadoDto } from '@project20/shared';
import { IaRespostaProvedor, IaSolicitacaoProvedor } from './ia.tipos';

/** Contrato de um provedor de IA. Anthropic, Google (Gemini) e OpenAI o implementam; cada um traduz o contrato neutro do projeto para o do seu SDK. */
export interface IaProvedor {
    /** Tem o que precisa para chamar (por exemplo, a chave de API)? */
    estaDisponivel(): boolean;
    /** Resposta completa. */
    gerar(solicitacao: IaSolicitacaoProvedor): Promise<IaRespostaProvedor>;
    /** Resposta em streaming: `aoTrecho` recebe cada pedaço de texto assim que chega; devolve a resposta completa no fim. */
    transmitir(solicitacao: IaSolicitacaoProvedor, aoTrecho: (trecho: string) => void): Promise<IaRespostaProvedor>;
    /**
     * Os modelos de texto que o provedor oferece (spec 309), já filtrados e no formato da tela (`id` e nome amigável), do mais novo ao mais antigo.
     * Só é chamado com o provedor disponível; falha do SDK sobe como veio (quem chama decide o que fazer e a registra sem dado sensível).
     */
    listarModelos(): Promise<IaModeloListadoDto[]>;
}
