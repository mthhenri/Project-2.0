import { MensagemDoBarramento } from '../domain/mensagem-direta-barramento';
import { OuvinteDoBarramento, PublicadorDeEventosDiretos } from './publicador-de-eventos-diretos';

/** O barramento do desenvolvimento: só enxerga os ouvintes deste processo, então vale para uma instância só. */
export class PublicadorEmMemoria implements PublicadorDeEventosDiretos {
  private readonly ouvintes = new Set<OuvinteDoBarramento>();

  async publicar(mensagem: MensagemDoBarramento): Promise<void> {
    for (const ouvinte of [...this.ouvintes]) ouvinte.aoReceber(mensagem);
  }

  assinar(ouvinte: OuvinteDoBarramento): () => void {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }
}
