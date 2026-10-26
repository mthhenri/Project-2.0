import { Injectable } from '@nestjs/common';
import {
  campoDaAbaDoPlano,
  contarOcorrenciasDoTrecho,
  PlanoAbaEnum,
  PlanoInternoAlterarDto,
  PlanoRecuperadoDto,
  podeVerAbaDoPlano,
  PropostaAlterarTrechoPlanoDadosDto,
  substituirTrechoUnico,
  textoDaAbaDoPlano,
  TipoPropostaIaEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { PropostaObsoletaException } from '../../proposta-ia/domain/proposta-obsoleta.exception';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { PlanoService } from '../services/plano.service';

/**
 * Executor da proposta `ALTERAR_TRECHO_PLANO` (task 234): troca o trecho antigo pelo novo na aba do plano, pela `PlanoService.alterar` com o usuário do
 * token, com a versão **de agora** (não a da proposta). Se o trecho antigo não está mais no texto (ou aparece mais de uma vez), a proposta **expira**.
 * Quem pode editar o plano a resolve, mesmo que a IA a tenha criado a pedido de outra pessoa. Desfazer devolve o trecho antigo **só se** o trecho novo
 * ainda estiver lá, uma vez só: se alguém mexeu depois, recusa e não perde a edição.
 */
@Injectable()
export class AlterarTrechoDoPlanoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO;

  constructor(private readonly planoService: PlanoService) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaAlterarTrechoPlanoDadosDto, dados);
    if (entrada.trechoAntigo === entrada.trechoNovo) throw new BusinessException('O trecho novo é igual ao antigo: não há o que alterar');
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAlterarTrechoPlanoDadosDto, dados);
    const plano = await this.lerPlano(entrada.planoId, entrada.aba, usuarioAtivo);
    const novoTexto = substituirTrechoUnico(textoDaAbaDoPlano(plano, entrada.aba) ?? '', entrada.trechoAntigo, entrada.trechoNovo);
    if (novoTexto === null) {
      throw new PropostaObsoletaException('O trecho já não está no texto como estava (o documento mudou depois da proposta): esta alteração expirou. Peça de novo à IA.');
    }
    await this.gravar(plano, entrada.aba, novoTexto, usuarioAtivo);
    return { planoId: plano.id, aba: entrada.aba, trechoAntigo: entrada.trechoAntigo, trechoNovo: entrada.trechoNovo };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const entrada = validarDadosDaProposta(PropostaAlterarTrechoPlanoDadosDto, { ...resultado, versao: 1 });
    const plano = await this.lerPlano(entrada.planoId, entrada.aba, usuarioAtivo);
    const textoRestaurado = substituirTrechoUnico(textoDaAbaDoPlano(plano, entrada.aba) ?? '', entrada.trechoNovo, entrada.trechoAntigo);
    if (textoRestaurado === null) {
      throw new BusinessException('O trecho foi alterado depois: não dá para desfazer sem perder essa edição');
    }
    await this.gravar(plano, entrada.aba, textoRestaurado, usuarioAtivo);
  }

  /** Obsoleta: o trecho antigo já não aparece uma vez só no texto da aba (ou a pessoa já não vê o plano). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAlterarTrechoPlanoDadosDto, dados);
    try {
      const plano = await this.lerPlano(entrada.planoId, entrada.aba, usuarioAtivo);
      return contarOcorrenciasDoTrecho(textoDaAbaDoPlano(plano, entrada.aba) ?? '', entrada.trechoAntigo) !== 1;
    } catch {
      return true;
    }
  }

  /** Quem acessa o plano (a mesma regra de editar) pode resolver a proposta, mesmo não sendo quem pediu à IA. */
  async podeResolver(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAlterarTrechoPlanoDadosDto, dados);
    try {
      await this.planoService.recuperar({ id: entrada.planoId }, usuarioAtivo);
      return true;
    } catch {
      return false;
    }
  }

  /** O plano como a pessoa o vê (sem a aba do cliente para o desenvolvedor); recusa a aba que ela não pode mexer. */
  private async lerPlano(planoId: number, aba: PlanoAbaEnum, usuarioAtivo: JwtPayload): Promise<PlanoRecuperadoDto> {
    if (!podeVerAbaDoPlano(aba, usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('A descrição do cliente é só de gestor e administrador');
    }
    const plano = (await this.planoService.recuperar({ id: planoId }, usuarioAtivo)).dados;
    if (!plano) throw new BusinessException('Plano não encontrado');
    return plano;
  }

  private async gravar(plano: PlanoRecuperadoDto, aba: PlanoAbaEnum, texto: string, usuarioAtivo: JwtPayload): Promise<void> {
    const alteracao: PlanoInternoAlterarDto = { id: plano.id, versao: plano.versao, [campoDaAbaDoPlano(aba)]: texto };
    await this.planoService.alterar(alteracao, usuarioAtivo);
  }
}
