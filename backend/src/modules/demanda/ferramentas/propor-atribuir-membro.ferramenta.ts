import { Injectable } from '@nestjs/common';
import { ProporAtribuirMembroDto, PropostaAtribuirMembroDadosDto, TipoPropostaIaEnum, TipoUsuarioStatusEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { DemandaService } from '../services/demanda.service';

/**
 * Propõe adicionar ou remover um desenvolvedor como membro de uma demanda (o gestor, qualquer um; o desenvolvedor, só ele mesmo, como os
 * botões "Participar" e "Sair" da tela); **não altera nada** (só o clique de Confirmar
 * no cartão altera). Confere já aqui o que a service só diria no Confirmar: a pessoa existe e está ativa, **não é gestor** (o acesso
 * dos gestores é por tipo, nunca por `demanda_usuario`), ainda não é membro (adicionar) ou é (remover) e não é o último membro.
 */
@Injectable()
export class ProporAtribuirMembroFerramenta extends FerramentaPropostaIa<ProporAtribuirMembroDto> {
  readonly nome = 'propor_atribuir_membro';
  readonly descricao =
    'Propõe ADICIONAR ou REMOVER (`acao`) um desenvolvedor como membro de uma demanda; o `demandaId` vem de listar_demandas_do_projeto. ' +
    'O desenvolvedor só entra e sai ELE MESMO ("quero participar", "sai da demanda"): não informe usuarioId. O gestor informa o `usuarioId` de quem entra ou sai (de listar_usuarios; nome ambíguo, pergunte; nunca invente id). ' +
    'Gestores e administradores não são atribuídos (acesso por tipo): a proposta é recusada. Nada muda até o usuário confirmar no cartão. ' +
    'Ser membro é o que dá ao desenvolvedor acesso ao projeto da demanda.';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProporAtribuirMembroDto;
  readonly tipoProposta = TipoPropostaIaEnum.ATRIBUIR_MEMBRO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaService: DemandaService,
    private readonly usuarioService: UsuarioService,
    private readonly projetoService: ProjetoService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAtribuirMembroDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new BusinessException('Demanda não encontrada');
    // Sem usuarioId é quem conversa; o desenvolvedor só mexe em si mesmo (a service também confere).
    const usuarioId = entrada.usuarioId ?? usuarioAtivo.sub;
    if (usuarioId !== usuarioAtivo.sub && !temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new BusinessException('O desenvolvedor só entra e sai de uma demanda ele mesmo. Só o gestor coloca ou tira outra pessoa.');
    }
    const usuario = (await this.usuarioService.recuperar({ id: usuarioId }, usuarioAtivo)).dados;
    if (!usuario) throw new BusinessException('Usuário não encontrado');

    if (temPermissaoDeGestor(usuario.tipo)) {
      throw new BusinessException(`${usuario.nomeCompleto} é gestor: gestores têm acesso a todas as demandas por tipo e não são atribuídos como membros. Avise o usuário.`);
    }
    if (usuario.status !== TipoUsuarioStatusEnum.ATIVO) throw new BusinessException(`${usuario.nomeCompleto} está inativo e não pode ser atribuído.`);

    const membros = (await this.demandaService.listarMembros({ id: entrada.demandaId }, usuarioAtivo)).dados ?? [];
    const ehMembro = membros.some((membro) => membro.usuarioId === usuarioId);
    if (entrada.acao === 'ADICIONAR' && ehMembro) throw new BusinessException(`${usuario.nomeCompleto} já é membro de "${demanda.nome}". Avise o usuário.`);
    if (entrada.acao === 'REMOVER' && !ehMembro) throw new BusinessException(`${usuario.nomeCompleto} não é membro de "${demanda.nome}": não há o que remover. Avise o usuário.`);
    if (entrada.acao === 'REMOVER' && membros.length <= 1) throw new BusinessException('Não é possível remover o último membro da demanda. Avise o usuário.');

    const projeto = (await this.projetoService.recuperar({ id: demanda.projetoId }, usuarioAtivo)).dados;
    const dados: PropostaAtribuirMembroDadosDto = {
      ...entrada,
      usuarioId,
      demandaNome: demanda.nome,
      projetoNome: projeto?.nome,
      usuarioNome: usuario.nomeCompleto,
      usuarioCargo: usuario.cargoTitulo,
    };
    return { ...dados };
  }
}
