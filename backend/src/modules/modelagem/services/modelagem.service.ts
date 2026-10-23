import { Injectable } from '@nestjs/common';
import { ModelagemDiagramaDto, StandardResponse } from '@project20/shared';
import { CONFIGURACAO_MODELAGEM } from '../domain/modelagem.configuracao';
import { montarDiagrama, montarModelo, posicionar } from '../domain/modelagem';
import { ModelagemRepository } from '../repositories/modelagem.repository';

/** O schema só muda numa migration (a cada deploy), então o diagrama montado fica em memória por pouco tempo, para não reler o catálogo a cada abertura da tela. */
const TEMPO_DO_CACHE_MS = 60_000;

/**
 * Diagrama da modelagem do banco (tela Modelagem), montado do catálogo do PostgreSQL a cada deploy ou migration: nada a regerar
 * à mão. Para qualquer usuário autenticado (a rota não tem restrição de tipo). Grupos e posições vêm de `modelagem.configuracao.ts`.
 */
@Injectable()
export class ModelagemService {
  private cache: { diagrama: ModelagemDiagramaDto; expiraEm: number } | null = null;

  constructor(private readonly modelagemRepository: ModelagemRepository) {}

  async obterDiagrama(): Promise<StandardResponse<ModelagemDiagramaDto>> {
    const agora = Date.now();
    if (!this.cache || this.cache.expiraEm <= agora) {
      this.cache = { diagrama: await this.montarDiagramaAtual(), expiraEm: agora + TEMPO_DO_CACHE_MS };
    }
    return { sucesso: true, dados: this.cache.diagrama, mensagem: 'Modelagem consultada com sucesso' };
  }

  private async montarDiagramaAtual(): Promise<ModelagemDiagramaDto> {
    const [colunas, chavesPrimarias, chavesEstrangeiras, ultimaMigration] = await Promise.all([
      this.modelagemRepository.listarColunas(),
      this.modelagemRepository.listarChavesPrimarias(),
      this.modelagemRepository.listarChavesEstrangeiras(),
      this.modelagemRepository.obterUltimaMigration(),
    ]);
    const modelo = montarModelo(colunas, chavesPrimarias, chavesEstrangeiras, CONFIGURACAO_MODELAGEM);
    const posicionado = posicionar(modelo, CONFIGURACAO_MODELAGEM.posicoes, Object.keys(CONFIGURACAO_MODELAGEM.grupos));
    const origem = `PostgreSQL · última migration: ${ultimaMigration?.replace(/\.sql$/, '') ?? 'nenhuma aplicada'}`;
    return montarDiagrama(posicionado.tabelas, CONFIGURACAO_MODELAGEM, origem, [...modelo.avisos, ...posicionado.avisos]);
  }
}
