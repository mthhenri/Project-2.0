import { Injectable } from '@nestjs/common';
import { ProporJustificarPontoDto, PropostaJustificarPontoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PontoJustificativaRepository } from '../../ponto-justificativa/repositories/ponto-justificativa.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';

/**
 * Propõe justificar o ponto de OUTRA pessoa num dia (task 231); **não grava nada** (só o clique de Confirmar grava). É a mesma ação da tela de
 * justificativas, só do gestor. Confere já aqui o que a service só diria no Confirmar (pessoa existe, horas dentro da jornada, dia ainda sem
 * justificativa), para o cartão não nascer impossível. A regra continua na `PontoJustificativaService`.
 */
@Injectable()
export class ProporJustificarPontoFerramenta extends FerramentaPropostaIa<ProporJustificarPontoDto> {
  readonly nome = 'propor_justificar_ponto';
  readonly descricao =
    'Propõe justificar o ponto de OUTRA pessoa em um dia: horas que não contam na meta (horasCobertas, até a jornada dela), o título (nome) e o motivo combinado (descricao). ' +
    'Só o gestor, e só para outra pessoa: nunca para o próprio gestor. O desenvolvedor não justifica o próprio ponto, e esta ferramenta não existe para ele. ' +
    'O usuarioId vem de listar_usuarios (nome ambíguo, pergunte; nunca invente id) e o dia é YYYY-MM-DD. Não vale para dia que já tem justificativa. Nada é gravado até o gestor confirmar no cartão.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporJustificarPontoDto;
  readonly tipoProposta = TipoPropostaIaEnum.JUSTIFICAR_PONTO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly usuarioService: UsuarioService,
    private readonly pontoJustificativaRepositorio: PontoJustificativaRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporJustificarPontoDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    if (entrada.usuarioId === usuarioAtivo.sub) {
      throw new BusinessException('Só se justifica o ponto de outra pessoa, não o seu. Avise o usuário.');
    }
    const usuario = (await this.usuarioService.recuperar({ id: entrada.usuarioId }, usuarioAtivo)).dados;
    if (!usuario) throw new BusinessException('Usuário não encontrado');
    if (entrada.horasCobertas > usuario.horasDiariasNecessarias) {
      throw new BusinessException(`A justificativa não pode cobrir mais horas que a jornada diária de ${usuario.nomeCompleto} (${usuario.horasDiariasNecessarias} h).`);
    }
    if (await this.pontoJustificativaRepositorio.validarPorUsuarioEDia({ usuarioId: entrada.usuarioId, diaData: entrada.diaData })) {
      throw new BusinessException(`Já existe uma justificativa de ${usuario.nomeCompleto} em ${entrada.diaData}. Avise o usuário.`);
    }
    const dados: PropostaJustificarPontoDadosDto = { ...entrada, usuarioNome: usuario.nomeCompleto };
    return { ...dados };
  }
}
