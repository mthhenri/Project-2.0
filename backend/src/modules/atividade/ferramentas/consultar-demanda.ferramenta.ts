import { Injectable } from '@nestjs/common';
import { DemandaConsultadaDto, DemandaConsultarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaService } from '../../demanda/services/demanda.service';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { AtividadeService } from '../services/atividade.service';

/** Quantos caracteres de cada texto longo voltam à IA, e quantas atividades da demanda. */
export const LIMITE_DE_TEXTO_DA_DEMANDA = 2000;
export const LIMITE_ATIVIDADES_DA_DEMANDA = 30;

function cortar(texto: string | null): { texto: string | null; cortado: boolean } {
  if (texto === null) return { texto: null, cortado: false };
  return texto.length > LIMITE_DE_TEXTO_DA_DEMANDA ? { texto: texto.slice(0, LIMITE_DE_TEXTO_DA_DEMANDA), cortado: true } : { texto, cortado: false };
}

/**
 * Uma demanda por inteiro (task 153): descrições, documentação, tags e atividades. Só o gestor. Mora no módulo de atividade porque lê as
 * atividades da demanda (o módulo de demanda não depende do de atividade).
 */
@Injectable()
export class ConsultarDemandaFerramenta extends FerramentaIa<DemandaConsultarDto> {
  readonly nome = 'consultar_demanda';
  readonly descricao =
    'Consulta uma demanda: status, hierarquia, horas, previsão, descrição técnica e do cliente, documentação (textos longos vêm cortados), tags e as atividades com responsável e tempo executado. ' +
    'O demandaId vem de listar_demandas_do_projeto ou do grafo do projeto.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = DemandaConsultarDto;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly atividadeService: AtividadeService,
  ) {
    super();
  }

  async executar(entrada: DemandaConsultarDto, usuarioAtivo: JwtPayload): Promise<DemandaConsultadaDto> {
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new Error('Demanda não encontrada');
    const tags = (await this.demandaService.listarTagsDemanda({ id: entrada.demandaId }, usuarioAtivo)).dados ?? [];
    const atividades = (await this.atividadeService.listar({ demandaId: entrada.demandaId, itensPorPagina: LIMITE_ATIVIDADES_DA_DEMANDA }, usuarioAtivo)).dados;
    const tecnica = cortar(demanda.descricaoTecnica);
    const cliente = cortar(demanda.descricaoCliente);
    const documentacao = cortar(demanda.documentacao);
    return {
      id: demanda.id,
      nome: demanda.nome,
      projetoId: demanda.projetoId,
      demandaPaiId: demanda.demandaPaiId,
      isEstrutural: demanda.isEstrutural,
      status: demanda.status,
      horasEstimadas: demanda.horasEstimadas,
      previsaoFimData: demanda.previsaoFimData,
      descricaoTecnica: tecnica.texto,
      descricaoCliente: cliente.texto,
      documentacao: documentacao.texto,
      textoCortado: tecnica.cortado || cliente.cortado || documentacao.cortado,
      tags: tags.map((tag) => tag.nome),
      atividades: (atividades?.itens ?? []).map((atividade) => ({
        id: atividade.id,
        nome: atividade.nome,
        status: atividade.status,
        usuario: atividade.nomeUsuario,
        minutosExecutados: atividade.totalMinutosExecutados,
        emExecucao: atividade.execucaoAtivaId !== null,
      })),
      totalAtividades: atividades?.totalItens ?? 0,
      haMaisAtividades: (atividades?.totalItens ?? 0) > (atividades?.itens.length ?? 0),
    };
  }
}
