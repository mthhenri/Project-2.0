import { Injectable } from '@nestjs/common';
import { ExecucaoAtivaConsultadaDto, ExecucaoAtivaConsultarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { recuperarExecucaoAtivaDetalhada } from '../domain/execucao-ativa-detalhada';
import { ExecucaoService } from '../services/execucao.service';

/** A execução em andamento do **próprio** usuário (no máximo uma), com a atividade, a demanda e o tempo até agora. */
@Injectable()
export class ConsultarExecucaoAtivaFerramenta extends FerramentaIa<ExecucaoAtivaConsultarDto> {
  readonly nome = 'consultar_execucao_ativa';
  readonly descricao =
    'Diz se o usuário tem uma execução em andamento e, se tiver, qual atividade, demanda e projeto, a descrição provisória, quando começou e há quantos minutos. ' +
    'Use antes de propor iniciar ou pausar uma execução e quando o usuário perguntar no que está trabalhando.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ExecucaoAtivaConsultarDto;

  constructor(private readonly execucaoService: ExecucaoService) {
    super();
  }

  async executar(_entrada: ExecucaoAtivaConsultarDto, usuarioAtivo: JwtPayload): Promise<ExecucaoAtivaConsultadaDto> {
    const ativa = await recuperarExecucaoAtivaDetalhada(this.execucaoService, usuarioAtivo);
    if (!ativa) return { ativa: false };

    const inicio = ativa.inicioData;
    return {
      ativa: true,
      execucaoId: ativa.id,
      atividade: ativa.nomeAtividade,
      demanda: ativa.nomeDemanda,
      projeto: ativa.nomeProjeto,
      descricao: ativa.descricao,
      inicio: inicio.toISOString(),
      minutosAteAgora: Math.max(0, Math.round((this.agora().getTime() - inicio.getTime()) / 60_000)),
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
