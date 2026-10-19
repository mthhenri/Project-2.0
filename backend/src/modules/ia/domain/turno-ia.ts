import { AsyncLocalStorage } from 'node:async_hooks';
import { NivelIaEnum } from '@project20/shared';
import { IaResposta, IaTokens } from './ia.tipos';

const ORDEM_DOS_NIVEIS: Record<NivelIaEnum, number> = {
  [NivelIaEnum.RAPIDO]: 0,
  [NivelIaEnum.PADRAO]: 1,
  [NivelIaEnum.ANALITICO]: 2,
};

/** O maior dos dois níveis, na ordem `RAPIDO < PADRAO < ANALITICO`. */
export function nivelMaisAlto(primeiro: NivelIaEnum, segundo: NivelIaEnum): NivelIaEnum {
  return ORDEM_DOS_NIVEIS[segundo] > ORDEM_DOS_NIVEIS[primeiro] ? segundo : primeiro;
}

/**
 * O que um turno do chat gastou de IA (task 188): toda chamada bem-sucedida feita enquanto o turno está aberto, seja a da própria
 * conversa ou a de uma ferramenta que chama a IA por baixo. O nível do turno é o mais alto usado; o modelo é o da última chamada desse
 * nível; os tokens são a soma. Chamada que falhou nunca chega aqui.
 */
export class TurnoIa {
  private nivelAtual: NivelIaEnum = NivelIaEnum.RAPIDO;
  private modeloAtual: string | null = null;
  private readonly somaDosTokens: IaTokens = { entrada: 0, saida: 0, cache: 0 };

  registrar(resposta: Pick<IaResposta, 'nivel' | 'modelo' | 'tokens'>): void {
    if (this.modeloAtual === null || ORDEM_DOS_NIVEIS[resposta.nivel] >= ORDEM_DOS_NIVEIS[this.nivelAtual]) {
      this.nivelAtual = resposta.nivel;
      this.modeloAtual = resposta.modelo;
    }
    this.somaDosTokens.entrada += resposta.tokens.entrada;
    this.somaDosTokens.saida += resposta.tokens.saida;
    this.somaDosTokens.cache += resposta.tokens.cache;
  }

  /** `RAPIDO` enquanto nenhuma chamada foi registrada. */
  get nivel(): NivelIaEnum {
    return this.nivelAtual;
  }

  get modelo(): string | null {
    return this.modeloAtual;
  }

  get tokens(): IaTokens {
    return { ...this.somaDosTokens };
  }
}

const turnoDaRequisicao = new AsyncLocalStorage<TurnoIa>();

/** Abre o turno: as chamadas ao `IaService` feitas dentro de `trabalho` (e de tudo o que ele espera) entram em `turno`. */
export function executarNoTurno<T>(turno: TurnoIa, trabalho: () => Promise<T>): Promise<T> {
  return turnoDaRequisicao.run(turno, trabalho);
}

/** O turno aberto neste fluxo assíncrono, ou `undefined` fora de um turno (relatório, assistente, prompts de teste...). */
export function turnoAtual(): TurnoIa | undefined {
  return turnoDaRequisicao.getStore();
}
