/**
 * Quem está online em todas as instâncias da API (task 209). Cada instância publica o conjunto de usuários que têm stream aberto NELA; aqui
 * se guarda o último conjunto de cada instância com validade. Online é a união dos conjuntos válidos: uma instância que cai e para de
 * publicar deixa de contar sozinha, sem que ninguém precise avisar a queda.
 */
export class PresencaGlobal {
  private readonly instancias = new Map<string, { usuarioIds: Set<number>; atualizadaEm: number }>();

  constructor(
    private readonly validadeEmMilissegundos: number,
    private readonly agora: () => number = Date.now,
  ) {}

  atualizarInstancia(instanciaId: string, usuarioIds: number[]): void {
    this.instancias.set(instanciaId, { usuarioIds: new Set(usuarioIds), atualizadaEm: this.agora() });
  }

  removerInstancia(instanciaId: string): void {
    this.instancias.delete(instanciaId);
  }

  /** Os usuários online agora; descarta as instâncias que não publicaram dentro da validade. */
  online(): Set<number> {
    const limite = this.agora() - this.validadeEmMilissegundos;
    const resultado = new Set<number>();
    for (const [instanciaId, situacao] of [...this.instancias]) {
      if (situacao.atualizadaEm < limite) {
        this.instancias.delete(instanciaId);
        continue;
      }
      for (const usuarioId of situacao.usuarioIds) resultado.add(usuarioId);
    }
    return resultado;
  }
}

export interface MudancaDePresenca {
  usuarioId: number;
  online: boolean;
}

/** O que mudou entre duas fotografias de quem está online, em ordem crescente de usuário. */
export function diferencaDePresenca(anterior: Set<number>, atual: Set<number>): MudancaDePresenca[] {
  const mudancas: MudancaDePresenca[] = [];
  for (const usuarioId of atual) if (!anterior.has(usuarioId)) mudancas.push({ usuarioId, online: true });
  for (const usuarioId of anterior) if (!atual.has(usuarioId)) mudancas.push({ usuarioId, online: false });
  return mudancas.sort((a, b) => a.usuarioId - b.usuarioId);
}
