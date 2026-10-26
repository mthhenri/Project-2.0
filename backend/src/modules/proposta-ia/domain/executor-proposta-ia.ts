import { Injectable } from '@nestjs/common';
import { TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

/**
 * Executa (e desfaz) uma proposta de um tipo. O executor **chama a service do domínio** com o usuário do token, então valem as mesmas
 * validações e permissões da tela. Cada bloco (6, 8 e 9) registra os seus; o mecanismo da task 136 não executa nada por conta própria.
 */
export interface ExecutorPropostaIa {
  readonly tipo: TipoPropostaIaEnum;
  /** Lança `BusinessException` se os dados não servem. Roda antes de a proposta sair de `PENDENTE`. */
  validar(dados: Record<string, unknown>): void;
  /** Devolve o resultado (ids do que foi criado ou alterado), guardado na proposta para o desfazer. */
  executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>>;
  /** Aplica a ação inversa; lança `BusinessException` se já não for seguro (o estado mudou depois). */
  desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void>;
  /**
   * Opcional: a proposta pendente ficou obsoleta porque o estado mudou (por exemplo, a execução que ela pausaria já acabou)? Quando a IA
   * volta de uma queda, as pendentes obsoletas expiram em vez de aparecer como se ainda valessem.
   */
  estaObsoleta?(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean>;
  /**
   * Opcional: além de quem a criou, esta pessoa também pode ver, confirmar, recusar e desfazer a proposta? É o caso da alteração de trecho do plano
   * (task 234): quem pode editar o plano a resolve, mesmo que a IA a tenha criado a pedido de outra pessoa. Sem este método, só o dono resolve.
   */
  podeResolver?(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean>;
}

/** Os executores por tipo. Cada executor se registra na subida do módulo dele. */
@Injectable()
export class ExecutorPropostaIaRegistro {
  private readonly executores = new Map<TipoPropostaIaEnum, ExecutorPropostaIa>();

  registrar(executor: ExecutorPropostaIa): void {
    if (this.executores.has(executor.tipo)) {
      throw new Error(`Já existe um executor de proposta registrado para ${executor.tipo}`);
    }
    this.executores.set(executor.tipo, executor);
  }

  /** O executor do tipo, ou erro claro: um tipo sem executor nunca executa nada. */
  obter(tipo: TipoPropostaIaEnum): ExecutorPropostaIa {
    const executor = this.executores.get(tipo);
    if (!executor) throw new BusinessException(`A ação "${tipo}" ainda não está disponível para a IA`);
    return executor;
  }
}
