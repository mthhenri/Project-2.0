import { Injectable } from '@nestjs/common';
import { PlanoCompletoDto, PlanoRepository } from '../repositories/plano.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import {
  DemandaRecuperadaDto,
  PlanoAbaEnum,
  PlanoAlteradoDto,
  PlanoArquivadoDto,
  PlanoCriadoDto,
  PlanoCriarDto,
  PlanoDemandaInternoLigarDto,
  PlanoDemandaLigadaDto,
  PlanoInternoAlterarDto,
  PlanoInternoArquivarDto,
  PlanoListarDto,
  PlanoProjetoAtribuidoDto,
  PlanoProjetoInternoAtribuirDto,
  PlanoRecuperadoDto,
  PlanoRecuperarDto,
  PlanoResumoDto,
  PlanoSoloInternoMarcarDto,
  PlanoSoloMarcadoDto,
  StandardResponse,
  TITULO_PADRAO_DO_PLANO,
  TipoUsuarioEnum,
  podeAcessarPlano,
  podeArquivarOuExcluirPlano,
  podeEditarAbaDoPlano,
  temPermissaoDeGestor,
  textoInicialDaAba,
} from '@project20/shared';

const MENSAGEM_VERSAO_MAIS_NOVA = 'O plano foi alterado por outra pessoa. Recarregue para ver a versão mais nova antes de gravar.';

@Injectable()
export class PlanoService {
  constructor(
    private readonly planoRepositorio: PlanoRepository,
    private readonly demandaRepositorio: DemandaRepository,
    private readonly projetoRepositorio: ProjetoRepository,
  ) {}

  /**
   * Cria um plano: de projeto (a pessoa precisa de acesso a ele), amplo e pessoal (sem projeto e sem demanda) ou já ligado a uma demanda
   * (que ela precise poder editar; sem `projetoId`, o plano nasce no projeto da demanda).
   */
  async criar(dto: PlanoCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoCriadoDto>> {
    let projetoId = dto.projetoId ?? null;
    let demanda: DemandaRecuperadaDto | null = null;

    if (dto.demandaId !== undefined) {
      demanda = await this.recuperarDemandaEditavel(dto.demandaId, usuarioAtivo);
      if (projetoId !== null && demanda.projetoId !== projetoId) {
        throw new BusinessException('A demanda não pertence ao projeto do plano');
      }
      projetoId = demanda.projetoId;
    }
    if (projetoId !== null) await this.validarAcessoAoProjeto(projetoId, usuarioAtivo);

    const titulo = dto.titulo?.trim() || TITULO_PADRAO_DO_PLANO;
    const { id } = await this.planoRepositorio.inserir({ titulo, projetoId, usuarioId: usuarioAtivo.sub });

    let versao = 1;
    if (demanda) {
      const planoNovo = (await this.planoRepositorio.recuperar({ id })) as PlanoCompletoDto;
      versao = (await this.ligarEPreencher(planoNovo, demanda)).versao;
    }

    return {
      sucesso:  true,
      dados:    { id, titulo, projetoId, demandaId: demanda?.id ?? null, isSolo: false, versao },
      mensagem: 'Plano criado com sucesso',
    };
  }

  /** Lista os planos que a pessoa vê (o seletor do chat), com busca por título. */
  async listar(dto: PlanoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoResumoDto[]>> {
    const planos = await this.planoRepositorio.listar({
      usuarioId:         usuarioAtivo.sub,
      ehGestor:          temPermissaoDeGestor(usuarioAtivo.tipo),
      busca:             dto.busca,
      incluirArquivados: dto.incluirArquivados,
      projetoId:         dto.projetoId,
    });
    return { sucesso: true, dados: planos, mensagem: 'Planos listados com sucesso' };
  }

  /** Recupera o plano com os três textos: a descrição do cliente é lida por todos, só a alteração é de gestor e administrador. */
  async recuperar(dto: PlanoRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoRecuperadoDto>> {
    const dados = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);

    return { sucesso: true, dados, mensagem: 'Plano recuperado com sucesso' };
  }

  /**
   * Grava título e textos com a versão lida; versão mais nova no banco recusa a gravação. A descrição do cliente é só de gestor e
   * administrador (`SYSTEM.SPEC.md` §14).
   */
  async alterar(dto: PlanoInternoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoAlteradoDto>> {
    await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);

    if (dto.descricaoCliente !== undefined && !podeEditarAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas gestores podem alterar a descrição do cliente');
    }
    if (
      dto.titulo === undefined &&
      dto.descricaoTecnica === undefined &&
      dto.descricaoCliente === undefined &&
      dto.documentacao === undefined
    ) {
      throw new BusinessException('Informe ao menos um campo para alterar');
    }

    const planoAlterado = await this.planoRepositorio.alterar(dto);
    if (!planoAlterado) throw new ConflictException(MENSAGEM_VERSAO_MAIS_NOVA);

    return { sucesso: true, dados: planoAlterado, mensagem: 'Plano alterado com sucesso' };
  }

  /** Só o criador marca e desmarca o plano como solo. */
  async marcarSolo(dto: PlanoSoloInternoMarcarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoSoloMarcadoDto>> {
    const plano = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);
    if (plano.criadorId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException('Apenas quem criou o plano o marca como solo');
    }

    const planoMarcado = await this.planoRepositorio.marcarSolo({ id: dto.id, isSolo: dto.isSolo });
    return { sucesso: true, dados: planoMarcado, mensagem: dto.isSolo ? 'Plano marcado como solo' : 'Plano compartilhado com o projeto' };
  }

  /** Arquiva (sai do seletor, continua na busca) ou desarquiva. Criador, gestor e administrador. */
  async arquivar(dto: PlanoInternoArquivarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoArquivadoDto>> {
    const plano = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);
    this.validarPodeArquivarOuExcluir(plano, usuarioAtivo);

    const planoArquivado = await this.planoRepositorio.arquivar({ id: dto.id, isArquivado: dto.isArquivado });
    return { sucesso: true, dados: planoArquivado, mensagem: dto.isArquivado ? 'Plano arquivado' : 'Plano desarquivado' };
  }

  /** Soft delete do plano e da ligação dele com a demanda. Criador, gestor e administrador. */
  async excluir(dto: PlanoRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
    const plano = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);
    this.validarPodeArquivarOuExcluir(plano, usuarioAtivo);

    await this.planoRepositorio.excluir({ id: dto.id });
    return { sucesso: true, dados: null, mensagem: 'Plano excluído com sucesso' };
  }

  /**
   * Liga (ou troca) a demanda do plano. Quem edita o plano liga, desde que possa editar a demanda e ela seja do projeto do plano.
   * A aba vazia do plano começa com o texto atual da demanda; aba já escrita não é sobrescrita.
   */
  async ligarDemanda(dto: PlanoDemandaInternoLigarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoDemandaLigadaDto>> {
    const plano = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);
    if (plano.projetoId === null) {
      throw new BusinessException('Plano amplo não liga a demanda; atribua um projeto ao plano antes');
    }
    const demanda = await this.recuperarDemandaEditavel(dto.demandaId, usuarioAtivo);
    if (demanda.projetoId !== plano.projetoId) {
      throw new BusinessException('A demanda não pertence ao projeto do plano');
    }

    const planoLigado = await this.ligarEPreencher(plano, demanda);
    return { sucesso: true, dados: { id: plano.id, demandaId: demanda.id, ...planoLigado }, mensagem: 'Demanda ligada ao plano' };
  }

  /** Dá um projeto ao plano amplo: só o criador, com confirmação explícita, e o plano não volta a ser pessoal. */
  async atribuirProjeto(
    dto: PlanoProjetoInternoAtribuirDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PlanoProjetoAtribuidoDto>> {
    const plano = await this.recuperarPlanoAcessivel(dto.id, usuarioAtivo);
    if (plano.criadorId !== usuarioAtivo.sub) {
      throw new UnauthorizedAccessException('Apenas quem criou o plano lhe atribui um projeto');
    }
    if (plano.projetoId !== null) throw new BusinessException('O plano já pertence a um projeto');
    if (!dto.confirmado) {
      throw new BusinessException('Confirme: o rascunho, a conversa e as fontes do plano passam a ser vistos pelo projeto e o plano não volta a ser pessoal');
    }
    await this.validarAcessoAoProjeto(dto.projetoId, usuarioAtivo);

    const atribuido = await this.planoRepositorio.atribuirProjeto({ id: dto.id, projetoId: dto.projetoId });
    if (!atribuido) throw new BusinessException('O plano já pertence a um projeto');

    return { sucesso: true, dados: { id: dto.id, projetoId: dto.projetoId }, mensagem: 'Projeto atribuído ao plano' };
  }

  /** Liga a demanda e preenche as abas vazias com o texto dela; o preenchimento é gravado com a versão lida, antes da ligação. */
  private async ligarEPreencher(
    plano: PlanoCompletoDto,
    demanda: DemandaRecuperadaDto,
  ): Promise<{ versao: number; abasPreenchidas: PlanoAbaEnum[] }> {
    if (plano.demandaId === demanda.id) return { versao: plano.versao, abasPreenchidas: [] };

    const textos = {
      descricaoTecnica: textoInicialDaAba(plano.descricaoTecnica, demanda.descricaoTecnica),
      descricaoCliente: textoInicialDaAba(plano.descricaoCliente, demanda.descricaoCliente),
      documentacao:     textoInicialDaAba(plano.documentacao, demanda.documentacao),
    };
    const abasPreenchidas: PlanoAbaEnum[] = [];
    if (textos.descricaoTecnica !== null) abasPreenchidas.push(PlanoAbaEnum.DESCRICAO_TECNICA);
    if (textos.descricaoCliente !== null) abasPreenchidas.push(PlanoAbaEnum.DESCRICAO_CLIENTE);
    if (textos.documentacao !== null) abasPreenchidas.push(PlanoAbaEnum.DOCUMENTACAO);

    let versao = plano.versao;
    if (abasPreenchidas.length > 0) {
      const planoPreenchido = await this.planoRepositorio.alterar({
        id:     plano.id,
        versao: plano.versao,
        ...(textos.descricaoTecnica !== null && { descricaoTecnica: textos.descricaoTecnica }),
        ...(textos.descricaoCliente !== null && { descricaoCliente: textos.descricaoCliente }),
        ...(textos.documentacao !== null && { documentacao: textos.documentacao }),
      });
      if (!planoPreenchido) throw new ConflictException(MENSAGEM_VERSAO_MAIS_NOVA);
      versao = planoPreenchido.versao;
    }

    await this.planoRepositorio.ligarDemanda({ planoId: plano.id, demandaId: demanda.id });
    return { versao, abasPreenchidas };
  }

  /** O plano que a pessoa pode acessar; o que ela não vê (inclusive plano solo ou amplo de outra pessoa) é "não encontrado". */
  private async recuperarPlanoAcessivel(id: number, usuarioAtivo: JwtPayload): Promise<PlanoCompletoDto> {
    const plano = await this.planoRepositorio.recuperar({ id });
    if (!plano || !(await this.podeAcessar(plano, usuarioAtivo))) throw new ResourceNotFoundException('Plano');
    return plano;
  }

  /** A pessoa vê e edita o plano? (`podeAcessarPlano`, do `shared`, com o acesso ao projeto que só o banco sabe.) */
  async podeAcessar(plano: PlanoCompletoDto, usuarioAtivo: JwtPayload): Promise<boolean> {
    const temAcessoAoProjeto =
      plano.projetoId !== null &&
      usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR &&
      (await this.demandaRepositorio.validarAcessoProjeto({ projetoId: plano.projetoId, usuarioId: usuarioAtivo.sub }));

    return podeAcessarPlano({
      tipoUsuario: usuarioAtivo.tipo,
      usuarioId:   usuarioAtivo.sub,
      criadorId:   plano.criadorId,
      projetoId:   plano.projetoId,
      isSolo:      plano.isSolo,
      temAcessoAoProjeto,
    });
  }

  /** A demanda existe e a pessoa pode editá-la: gestor e administrador sempre, desenvolvedor só como membro. */
  private async recuperarDemandaEditavel(demandaId: number, usuarioAtivo: JwtPayload): Promise<DemandaRecuperadaDto> {
    const demanda = await this.demandaRepositorio.recuperar({ id: demandaId });
    if (!demanda) throw new ResourceNotFoundException('Demanda');

    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) {
      const eMembro = await this.demandaRepositorio.validarMembro({ demandaId, usuarioId: usuarioAtivo.sub });
      if (!eMembro) throw new UnauthorizedAccessException('Você só pode ligar o plano a demandas das quais é membro');
    }
    return demanda;
  }

  /** O projeto existe e a pessoa tem acesso a ele (desenvolvedor: alguma demanda dele). */
  private async validarAcessoAoProjeto(projetoId: number, usuarioAtivo: JwtPayload): Promise<void> {
    const projeto = await this.projetoRepositorio.recuperar({ id: projetoId });
    if (!projeto) throw new ResourceNotFoundException('Projeto');

    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) {
      const temAcesso = await this.demandaRepositorio.validarAcessoProjeto({ projetoId, usuarioId: usuarioAtivo.sub });
      if (!temAcesso) throw new UnauthorizedAccessException('Você não tem acesso a este projeto');
    }
  }

  private validarPodeArquivarOuExcluir(plano: PlanoCompletoDto, usuarioAtivo: JwtPayload): void {
    if (!podeArquivarOuExcluirPlano(usuarioAtivo.tipo, usuarioAtivo.sub, plano.criadorId)) {
      throw new UnauthorizedAccessException('Apenas quem criou o plano, gestores e administradores o arquivam ou excluem');
    }
  }
}
