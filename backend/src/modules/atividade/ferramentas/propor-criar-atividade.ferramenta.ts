import { Injectable } from '@nestjs/common';
import { PropostaCriarAtividadeDadosDto, ProporCriarAtividadeDto, TipoPropostaIaEnum, TipoUsuarioStatusEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';

/**
 * Propõe criar uma atividade; **não cria nada** (só o clique de Confirmar no cartão cria). Uma chamada por atividade: várias atividades
 * de uma frase viram várias propostas. A demanda precisa existir (o modelo acha o id em `listar_minhas_atividades`).
 */
@Injectable()
export class ProporCriarAtividadeFerramenta extends FerramentaPropostaIa<ProporCriarAtividadeDto> {
  readonly nome = 'propor_criar_atividade';
  readonly descricao =
    'Propõe criar UMA atividade do usuário numa demanda, com nome e prioridade (URGENTE, ALTA, MEDIA, BAIXA ou INDEFINIDA; defina conforme o que o usuário disse). ' +
    'Nada é criado até o usuário confirmar no cartão. Se o usuário citar várias atividades, chame a ferramenta uma vez para cada. ' +
    'O demandaId vem das atividades já listadas; se o usuário citar uma demanda que você não conhece, pergunte qual é antes de propor. ' +
    'Atividade é um BLOCO do trabalho (a tela, o repositório, os testes), com várias execuções: nunca crie uma atividade por execução nem para uma continuação. ' +
    'ANTES de propor, olhe o checklist da demanda (consultar_checklist_da_demanda) e, se um bloco já serve, use-o; crie só quando falta o bloco, com um nome que descreve a parte do trabalho. ' +
    'Só o gestor pode criar a atividade PARA OUTRA PESSOA: nesse caso passe `usuarioId` (de listar_usuarios; nome ambíguo, pergunte); sem ele, a atividade é de quem conversa com você.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporCriarAtividadeDto;
  readonly tipoProposta = TipoPropostaIaEnum.CRIAR_ATIVIDADE;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly usuarioService: UsuarioService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporCriarAtividadeDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const demanda = await this.demandaRepositorio.recuperar({ id: entrada.demandaId });
    if (!demanda) throw new ResourceNotFoundException('Demanda');

    // Para si mesmo, `usuarioId` é só ruído: some da proposta. Para outra pessoa, só o gestor; a pessoa precisa existir e estar ativa.
    const { usuarioId, ...semUsuario } = entrada;
    let usuarioNome: string | undefined;
    if (usuarioId !== undefined && usuarioId !== usuarioAtivo.sub) {
      if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new BusinessException('Só o gestor cria atividade para outra pessoa. Crie a atividade para o próprio usuário.');
      const dono = (await this.usuarioService.recuperar({ id: usuarioId }, usuarioAtivo)).dados;
      if (!dono) throw new BusinessException('Usuário não encontrado');
      if (dono.status !== TipoUsuarioStatusEnum.ATIVO) throw new BusinessException(`${dono.nomeCompleto} está inativo e não recebe atividades.`);
      usuarioNome = dono.nomeCompleto;
    }
    const dados: PropostaCriarAtividadeDadosDto = {
      ...semUsuario,
      demandaNome: demanda.nome,
      ...(usuarioNome ? { usuarioId, usuarioNome } : {}),
    };
    return { ...dados };
  }
}
