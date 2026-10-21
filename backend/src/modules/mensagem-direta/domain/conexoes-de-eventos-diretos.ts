import { MensagemDiretaEventoDto } from '@project20/shared';

/** Um stream aberto de um usuário nesta instância (uma aba, o Project Desktop). */
export interface ConexaoDeEventosDiretos {
  enviar(evento: MensagemDiretaEventoDto): void;
  encerrar(): void;
}

/**
 * Os streams abertos NESTA instância da API, por usuário (a pessoa pode ter vários: abas e Desktop). Não conhece permissão nem outras
 * instâncias: entrega a quem está aqui. Uma conexão que falha ao receber é descartada, sem atrapalhar as demais.
 */
export class ConexoesDeEventosDiretos {
  private readonly porUsuario = new Map<number, Set<ConexaoDeEventosDiretos>>();

  /** Registra a conexão e devolve a função que a remove (idempotente). */
  adicionar(usuarioId: number, conexao: ConexaoDeEventosDiretos): () => void {
    const conexoes = this.porUsuario.get(usuarioId) ?? new Set<ConexaoDeEventosDiretos>();
    conexoes.add(conexao);
    this.porUsuario.set(usuarioId, conexoes);
    return () => this.remover(usuarioId, conexao);
  }

  private remover(usuarioId: number, conexao: ConexaoDeEventosDiretos): void {
    const conexoes = this.porUsuario.get(usuarioId);
    if (!conexoes) return;
    conexoes.delete(conexao);
    if (conexoes.size === 0) this.porUsuario.delete(usuarioId);
  }

  /** Os usuários com ao menos um stream aberto aqui, em ordem crescente. */
  usuariosConectados(): number[] {
    return [...this.porUsuario.keys()].sort((a, b) => a - b);
  }

  entregar(usuarioIds: number[], evento: MensagemDiretaEventoDto): void {
    for (const usuarioId of new Set(usuarioIds)) {
      for (const conexao of [...(this.porUsuario.get(usuarioId) ?? [])]) this.enviarSemFalhar(usuarioId, conexao, evento);
    }
  }

  entregarATodos(evento: MensagemDiretaEventoDto): void {
    this.entregar(this.usuariosConectados(), evento);
  }

  /** Fecha todas as conexões (parada da API). */
  encerrarTodas(): void {
    for (const [usuarioId, conexoes] of [...this.porUsuario]) {
      for (const conexao of [...conexoes]) {
        try {
          conexao.encerrar();
        } catch {
          // já fechada
        }
        this.remover(usuarioId, conexao);
      }
    }
  }

  private enviarSemFalhar(usuarioId: number, conexao: ConexaoDeEventosDiretos, evento: MensagemDiretaEventoDto): void {
    try {
      conexao.enviar(evento);
    } catch {
      this.remover(usuarioId, conexao);
    }
  }
}
