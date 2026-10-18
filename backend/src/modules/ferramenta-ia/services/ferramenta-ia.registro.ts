import { HttpException, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoUsuarioEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { IaFerramenta } from '../../ia/domain/ia.tipos';
import { gerarEsquemaDeClasse } from '../domain/esquema-da-classe';
import { FerramentaIa, ResultadoFerramentaIa, usuarioPodeUsar } from '../domain/ferramenta-ia';
import { sugereExclusao } from '../domain/sem-exclusao';

/** O que volta ao modelo não passa disto (listas longas estouram o contexto); cada ferramenta deve limitar o que devolve. */
export const LIMITE_RESULTADO_CARACTERES = 20_000;

/**
 * As ferramentas da IA (task 137). Cada módulo registra as suas na subida. `listarParaUsuario` mostra ao modelo só o que o tipo de
 * usuário pode usar; `executar` valida a entrada e roda a ferramenta com o usuário do token. **Nunca lança**: nome desconhecido, falta
 * de permissão, entrada inválida e falha da ferramenta voltam como resultado de erro para o modelo, e o turno continua.
 */
@Injectable()
export class FerramentaIaRegistro {
  private readonly logger = new Logger(FerramentaIaRegistro.name);
  private readonly ferramentas = new Map<string, FerramentaIa>();

  registrar(ferramenta: FerramentaIa): void {
    if (sugereExclusao(ferramenta.nome)) {
      throw new Error(`A ferramenta ${ferramenta.nome} sugere exclusão de dados, e a IA não exclui nada`);
    }
    if (this.ferramentas.has(ferramenta.nome)) {
      throw new Error(`Já existe uma ferramenta de IA registrada com o nome ${ferramenta.nome}`);
    }
    this.ferramentas.set(ferramenta.nome, ferramenta);
  }

  /** Todas as ferramentas registradas (para testes e auditoria, como o teste de "sem exclusão"). */
  listarTodas(): FerramentaIa[] {
    return [...this.ferramentas.values()];
  }

  /** As ferramentas que o usuário pode usar, no formato do contrato do provedor (task 130). */
  listarParaUsuario(usuarioAtivo: JwtPayload): IaFerramenta[] {
    return this.listarTodas()
      .filter((ferramenta) => usuarioPodeUsar(ferramenta.permissao, usuarioAtivo.tipo) && (ferramenta.habilitada?.() ?? true))
      .map((ferramenta) => ({
        nome: ferramenta.nome,
        descricao: ferramenta.descricao,
        esquemaEntrada: gerarEsquemaDeClasse(ferramenta.classeDeEntrada) as unknown as Record<string, unknown>,
      }));
  }

  async executar(nome: string, entradaBruta: unknown, usuarioAtivo: JwtPayload): Promise<ResultadoFerramentaIa> {
    const ferramenta = this.ferramentas.get(nome);
    if (!ferramenta) return this.erro(`A ferramenta "${nome}" não existe.`);
    if (!usuarioPodeUsar(ferramenta.permissao, usuarioAtivo.tipo as TipoUsuarioEnum)) {
      return this.erro(`Você não tem permissão para usar a ferramenta "${nome}".`);
    }

    if (ferramenta.habilitada && !ferramenta.habilitada()) return this.erro(`A ferramenta "${nome}" está desabilitada na configuração da IA.`);

    const entrada = plainToInstance(ferramenta.classeDeEntrada, entradaBruta ?? {});
    const problemas = await validate(entrada, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: false });
    if (problemas.length > 0) {
      const detalhes = problemas.flatMap((problema) => Object.values(problema.constraints ?? {})).join('; ');
      return this.erro(`Entrada inválida para "${nome}": ${detalhes}`);
    }

    try {
      const resultado = await ferramenta.executar(entrada, usuarioAtivo);
      const conteudo = this.limitar(JSON.stringify(resultado ?? null));
      const propostaId = ferramenta.tipo === 'PROPOSTA' ? (resultado as { propostaId?: number } | null)?.propostaId : undefined;
      return { conteudo, erro: false, ...(typeof propostaId === 'number' ? { propostaId } : {}) };
    } catch (erro) {
      return this.erro(this.mensagemDoErro(nome, erro));
    }
  }

  /** Erro de negócio (`HttpException`) tem mensagem própria para o usuário e vai ao modelo; qualquer outro vira texto genérico. */
  private mensagemDoErro(nome: string, erro: unknown): string {
    if (erro instanceof HttpException) {
      const resposta = erro.getResponse() as { mensagem?: string } | string;
      return typeof resposta === 'string' ? resposta : (resposta.mensagem ?? erro.message);
    }
    this.logger.error(`Falha na ferramenta ${nome}: ${erro instanceof Error ? erro.message : String(erro)}`);
    return `A ferramenta "${nome}" falhou por um erro interno.`;
  }

  private limitar(conteudo: string): string {
    if (conteudo.length <= LIMITE_RESULTADO_CARACTERES) return conteudo;
    return `${conteudo.slice(0, LIMITE_RESULTADO_CARACTERES)}… [resultado cortado: passou de ${LIMITE_RESULTADO_CARACTERES} caracteres]`;
  }

  private erro(mensagem: string): ResultadoFerramentaIa {
    return { conteudo: JSON.stringify({ erro: mensagem }), erro: true };
  }
}
