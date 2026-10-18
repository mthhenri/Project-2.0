import { Injectable } from '@nestjs/common';
import { PropostaCorrigirExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { validarPeriodoDaExecucao } from '../domain/periodo-da-execucao';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { ExecucaoService } from '../services/execucao.service';

const INFINITO = new Date(8.64e15);

const mesmoInstante = (a: Date | string | null | undefined, b: Date | string | null | undefined): boolean =>
  (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);

/**
 * Executor da proposta `CORRIGIR_EXECUCAO`: altera pela `ExecucaoService` com o usuário do token (o desenvolvedor só mexe nas próprias).
 * Confere de novo que a execução ainda está como estava na proposta (senão a proposta é velha) e que o período novo não se sobrepõe a
 * outra execução do dono: a `ExecucaoService.alterar` não confere sobreposição, então o executor confere. Desfazer devolve o período e a
 * descrição de antes, só se a execução ainda está como a correção a deixou.
 */
@Injectable()
export class CorrigirExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CORRIGIR_EXECUCAO;

  constructor(
    private readonly execucaoService: ExecucaoService,
    private readonly execucaoRepositorio: ExecucaoRepository,
    private readonly atividadeService: AtividadeService,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaCorrigirExecucaoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaCorrigirExecucaoDadosDto, dados);
    const atual = (await this.execucaoService.recuperar({ id: entrada.execucaoId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Execução não encontrada');
    if (!mesmoInstante(atual.inicioData, entrada.inicioAnteriorData) || !mesmoInstante(atual.fimData, entrada.fimAnteriorData)) {
      throw new BusinessException('A execução mudou depois desta proposta: peça a correção de novo');
    }

    const inicio = new Date(entrada.novoInicioData);
    const fim = entrada.novoFimData ? new Date(entrada.novoFimData) : null;
    validarPeriodoDaExecucao(inicio, fim, new Date());
    await this.exigirSemSobreposicao(atual.id, atual.atividadeId, inicio, fim, usuarioAtivo);

    const descricao = entrada.descricao ?? atual.descricao;
    await this.execucaoService.alterar({ id: atual.id, descricao, inicioData: inicio.toISOString(), fimData: fim ? fim.toISOString() : null }, usuarioAtivo);
    return {
      execucaoId: atual.id,
      inicioAnteriorData: entrada.inicioAnteriorData,
      fimAnteriorData: entrada.fimAnteriorData ?? null,
      descricaoAnterior: atual.descricao,
      novoInicioData: entrada.novoInicioData,
      novoFimData: entrada.novoFimData ?? null,
      descricaoNova: descricao,
    };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const execucaoId = Number(resultado['execucaoId']);
    if (!Number.isInteger(execucaoId)) throw new BusinessException('Não há execução a desfazer nesta proposta');
    const atual = (await this.execucaoService.recuperar({ id: execucaoId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Execução não encontrada');
    const mudouDepois =
      !mesmoInstante(atual.inicioData, resultado['novoInicioData'] as string) ||
      !mesmoInstante(atual.fimData, resultado['novoFimData'] as string | null) ||
      atual.descricao !== resultado['descricaoNova'];
    if (mudouDepois) throw new BusinessException('A execução mudou depois desta correção: não dá para desfazer com segurança');

    const fimAnterior = (resultado['fimAnteriorData'] as string | null) ?? null;
    // Devolver o período de antes não pode criar sobreposição com o que foi feito depois (as horas contariam em dobro no ponto); voltar a
    // "em andamento" vale até o infinito, então qualquer execução posterior também bloqueia. Quem confere é o dono da execução.
    const donoId = (await this.atividadeService.recuperar({ id: atual.atividadeId }, usuarioAtivo)).dados?.usuarioId ?? usuarioAtivo.sub;
    if (fimAnterior === null && (await this.execucaoService.recuperarAtivaDoUsuario({ usuarioId: donoId }, usuarioAtivo)).dados) {
      throw new BusinessException('Há outra execução em andamento: a anterior não pôde ser reaberta');
    }
    if (await this.execucaoRepositorio.validarSobreposicao({ usuarioId: donoId, inicioData: new Date(resultado['inicioAnteriorData'] as string), fimData: fimAnterior ? new Date(fimAnterior) : INFINITO, ignorarExecucaoId: execucaoId })) {
      throw new BusinessException('Há outra execução neste período: devolver o horário de antes se sobreporia a ela');
    }
    await this.execucaoService.alterar(
      { id: execucaoId, descricao: String(resultado['descricaoAnterior'] ?? ''), inicioData: resultado['inicioAnteriorData'] as string, fimData: fimAnterior },
      usuarioAtivo,
    );
  }

  /** Obsoleta quando a execução já está como a correção pede, ou já não está como a proposta a viu. */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaCorrigirExecucaoDadosDto, dados);
    const atual = (await this.execucaoService.recuperar({ id: entrada.execucaoId }, usuarioAtivo)).dados;
    if (!atual) return true;
    const jaCorrigida = mesmoInstante(atual.inicioData, entrada.novoInicioData) && mesmoInstante(atual.fimData, entrada.novoFimData);
    const mudou = !mesmoInstante(atual.inicioData, entrada.inicioAnteriorData) || !mesmoInstante(atual.fimData, entrada.fimAnteriorData);
    return jaCorrigida || mudou;
  }

  private async exigirSemSobreposicao(execucaoId: number, atividadeId: number, inicio: Date, fim: Date | null, usuarioAtivo: JwtPayload): Promise<void> {
    const atividade = (await this.atividadeService.recuperar({ id: atividadeId }, usuarioAtivo)).dados;
    if (!atividade) return;
    if (await this.execucaoRepositorio.validarSobreposicao({ usuarioId: atividade.usuarioId, inicioData: inicio, fimData: fim ?? INFINITO, ignorarExecucaoId: execucaoId })) {
      throw new BusinessException('O período corrigido se sobrepõe a outra execução da mesma pessoa');
    }
  }
}
