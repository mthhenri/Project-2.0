import { Injectable } from '@nestjs/common';
import { PropostaCorrigirExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { validarPeriodoDaExecucao } from '../domain/periodo-da-execucao';
import { ExecucaoService } from '../services/execucao.service';

const mesmoInstante = (item: Date | string | null | undefined, segundo: Date | string | null | undefined): boolean =>
    (item ? new Date(item).getTime() : null) === (segundo ? new Date(segundo).getTime() : null);

/**
 * Executor da proposta `CORRIGIR_EXECUCAO`: altera pela `ExecucaoService` com o usuário do token (o desenvolvedor só mexe nas próprias).
 * Confere de novo que a execução ainda está como estava na proposta (senão a proposta é velha) e que o período novo não se sobrepõe a
 * outra execução do dono: quem confere é a `ExecucaoService.alterar`. Desfazer devolve o período e a
 * descrição de antes, só se a execução ainda está como a correção a deixou.
 */
@Injectable()
export class CorrigirExecucaoExecutor implements ExecutorPropostaIa {
    readonly tipo = TipoPropostaIaEnum.CORRIGIR_EXECUCAO;

    constructor(private readonly execucaoService: ExecucaoService) {}

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
        // Reabrir ou devolver o período de antes sem criar execução em andamento dupla nem sobreposição: quem confere é `alterar`.
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
}
