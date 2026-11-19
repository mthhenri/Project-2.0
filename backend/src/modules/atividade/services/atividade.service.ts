import { Injectable } from '@nestjs/common';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { TagRepository } from '../../tag/repositories/tag.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import {
    AtividadeCriarDto,
    AtividadeCriadaDto,
    AtividadeListarDto,
    AtividadeResumoDto,
    AtividadeRecuperadaDto,
    AtividadeRecuperarDto,
    AtividadeInternoAlterarDto,
    AtividadeAlteradaDto,
    AtividadeTagsAtribuirDto,
    AtividadeTagsAtribuidasDto,
    TagResumoDto,
    TipoDemandaStatusEnum,
    temPermissaoDeGestor,
    temVisibilidadeTotal,
    podeEditarAtividadeDeOutro,
    podeAtribuirMembroOuTag,
} from '@project20/shared';
import { StandardResponse, TipoAtividadePrioridadeEnum } from '@project20/shared';
import { PaginatedResult } from '@project20/shared';
import { AtividadeRestaurarDto, AtividadeRestauradaDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

@Injectable()
export class AtividadeService {
    constructor(
        private readonly atividadeRepositorio: AtividadeRepository,
        private readonly demandaRepositorio: DemandaRepository,
        private readonly tagRepositorio: TagRepository,
        private readonly usuarioRepositorio: UsuarioRepository,
    ) {}

    /**
   * Cria nova atividade vinculada à demanda.
   * O usuário autenticado torna-se o executor principal; só o gestor escolhe outro dono (quem não pode e pede outro leva 403) e o dono escolhido precisa existir e estar ativo.
   * Verifica existência da demanda; o acesso via demanda_usuario só é exigido do
   * desenvolvedor (gestor tem acesso total a qualquer demanda, sem atribuição).
   * O dono da atividade também precisa ter acesso à demanda (task 377): quem não tem visibilidade total
   * tem de ser membro dela; o gestor que escolhe outro dono não cria atividade para quem não é membro.
   */
    async criar(
        dto: AtividadeCriarDto,
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<AtividadeCriadaDto>> {
        const demandaEncontrada = await this.demandaRepositorio.recuperar({ id: dto.demandaId });
        if (!demandaEncontrada) {
            throw new ResourceNotFoundException('Demanda');
        }

        // Só o gestor escolhe outro dono (como na ferramenta de IA): quem não pode e pede outra pessoa é recusado, em vez de ter a atividade criada no próprio nome em silêncio.
        if (dto.usuarioId !== undefined && dto.usuarioId !== usuarioAtivo.sub && !temPermissaoDeGestor(usuarioAtivo.tipo)) {
            throw new UnauthorizedAccessException('Só o gestor cria atividade para outra pessoa');
        }
        const executorId = dto.usuarioId ?? usuarioAtivo.sub;

        if (!temVisibilidadeTotal(usuarioAtivo.tipo)) {
            const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
                demandaId: dto.demandaId,
                usuarioId: usuarioAtivo.sub,
            });
            if (!temAcesso) {
                throw new UnauthorizedAccessException('Usuário não tem acesso à demanda informada');
            }
        }

        if (executorId !== usuarioAtivo.sub) {
            const executorEncontrado = await this.usuarioRepositorio.recuperar({ id: executorId });
            if (!executorEncontrado) {
                throw new ResourceNotFoundException('Usuário');
            }
            if (!executorEncontrado.ativo) {
                throw new BusinessException(`${executorEncontrado.nomeCompleto} está inativo e não recebe atividades`);
            }
            if (
                !temVisibilidadeTotal(executorEncontrado.tipo) &&
                !(await this.atividadeRepositorio.validarAcessoDemanda({ demandaId: dto.demandaId, usuarioId: executorId }))
            ) {
                throw new BusinessException(`${executorEncontrado.nomeCompleto} não é membro da demanda: atribua-o à demanda antes de criar a atividade para ele`);
            }
        }

        for (const tagId of dto.tagIds ?? []) {
            const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
            if (!tagEncontrada) {
                throw new ResourceNotFoundException(`Tag com id ${tagId}`);
            }
        }

        const atividadeCriada = await this.atividadeRepositorio.inserir({
            demandaId:     dto.demandaId,
            usuarioId:     executorId,
            nome:          dto.nome,
            status:        dto.status,
            prioridade:    dto.prioridade ?? TipoAtividadePrioridadeEnum.INDEFINIDA,
        });

        if (dto.tagIds && dto.tagIds.length > 0) {
            await this.atividadeRepositorio.alterarTags({ atividadeId: atividadeCriada.id, tagIds: dto.tagIds });
        }

        return {
            sucesso:  true,
            dados:    atividadeCriada,
            mensagem: 'Atividade criada com sucesso',
        };
    }

    /**
   * Lista atividades com paginação e filtros opcionais (executor, status,
   * demanda, busca textual e intervalo de data de criação).
   *
   * Controle de acesso por tipo de usuário:
   * - Gestor: vê as atividades de todos; pode opcionalmente filtrar por um
   *   executor específico via filtros.usuarioId.
   * - Desenvolvedor membro da demanda filtrada: vê todas as atividades dessa
   *   demanda.
   * - Desenvolvedor sem demandaId no filtro ou não-membro da demanda: vê
   *   somente as próprias atividades (usuarioId sobrescrito pelo id autenticado).
   */
    async listar(
        filtros: AtividadeListarDto,
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<PaginatedResult<AtividadeResumoDto>>> {
        const pagina         = filtros.pagina ?? 1;
        const itensPorPagina = filtros.itensPorPagina ?? 20;

        let filtrosEfetivos: AtividadeListarDto = filtros;
        if (!temVisibilidadeTotal(usuarioAtivo.tipo)) {
            const eMembroDaDemanda =
                filtros.demandaId !== undefined &&
        (await this.atividadeRepositorio.validarAcessoDemanda({
            demandaId: filtros.demandaId,
            usuarioId: usuarioAtivo.sub,
        }));

            filtrosEfetivos = eMembroDaDemanda
                ? filtros
                : { ...filtros, usuarioId: usuarioAtivo.sub };
        }

        const { itens, total } = await this.atividadeRepositorio.listar(filtrosEfetivos);

        if (filtros.allRows) {
            return {
                sucesso: true,
                dados: {
                    itens,
                    totalItens:     itens.length,
                    paginaAtual:    1,
                    itensPorPagina: itens.length,
                    totalPaginas:   1,
                },
                mensagem: 'Atividades listadas com sucesso',
            };
        }

        const totalPaginas     = Math.ceil(total / itensPorPagina);

        return {
            sucesso: true,
            dados: {
                itens,
                totalItens:    total,
                paginaAtual:   pagina,
                itensPorPagina,
                totalPaginas,
            },
            mensagem: 'Atividades listadas com sucesso',
        };
    }

    /**
   * Recupera atividade por ID.
   * Desenvolvedor precisa estar atribuído à demanda da atividade para acessá-la.
   */
    async recuperar(
        dto: AtividadeRecuperarDto,
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<AtividadeRecuperadaDto>> {
        const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
        if (!atividadeEncontrada) {
            throw new ResourceNotFoundException('Atividade');
        }

        if (!temVisibilidadeTotal(usuarioAtivo.tipo)) {
            const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
                demandaId: atividadeEncontrada.demandaId,
                usuarioId: usuarioAtivo.sub,
            });
            if (!temAcesso) {
                throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
            }
        }

        return {
            sucesso:  true,
            dados:    atividadeEncontrada,
            mensagem: 'Atividade recuperada com sucesso',
        };
    }

    /**
   * Altera campos da atividade.
   * O desenvolvedor só altera as próprias atividades (usuarioId); auxiliar, gestor e administrador alteram as de qualquer um.
   */
    async alterar(
        dto: AtividadeInternoAlterarDto,
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<AtividadeAlteradaDto>> {
        const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
        if (!atividadeEncontrada) {
            throw new ResourceNotFoundException('Atividade');
        }

        // Cada um altera as próprias atividades; só quem conduz o trabalho (auxiliar, gestor, administrador) altera as dos outros. Ser membro da demanda não basta.
        if (atividadeEncontrada.usuarioId !== usuarioAtivo.sub && !podeEditarAtividadeDeOutro(usuarioAtivo.tipo)) {
            throw new UnauthorizedAccessException('Só o dono da atividade, o auxiliar ou o gestor altera esta atividade');
        }

        if (dto.demandaId !== undefined && dto.demandaId !== atividadeEncontrada.demandaId) {
            await this.validarMudancaDeDemanda(dto.demandaId, atividadeEncontrada.usuarioId, usuarioAtivo);
        }

        if (dto.status !== undefined && dto.status !== atividadeEncontrada.status) {
            const possuiExecucaoAtiva = await this.atividadeRepositorio.possuiExecucaoAtiva({ id: dto.id });
            if (possuiExecucaoAtiva) {
                throw new BusinessException(
                    'Não é possível alterar o status de uma atividade com execução em andamento',
                );
            }
        }

        const atividadeAlterada = await this.atividadeRepositorio.alterar({
            id:            dto.id,
            nome:          dto.nome,
            status:        dto.status,
            prioridade:    dto.prioridade,
            demandaId:     dto.demandaId,
        });

        return {
            sucesso:  true,
            dados:    atividadeAlterada,
            mensagem: 'Atividade alterada com sucesso',
        };
    }

    /**
   * Mudar a atividade de demanda (task 229): só o dono da atividade e o gestor; a demanda de destino precisa existir e estar em aberto
   * (nem concluída nem cancelada), e o desenvolvedor precisa ter acesso a ela, como ao criar uma atividade lá. As execuções pertencem à
   * atividade e vão junto.
   */
    private async validarMudancaDeDemanda(demandaDestinoId: number, donoId: number, usuarioAtivo: JwtPayload): Promise<void> {
        if (!podeEditarAtividadeDeOutro(usuarioAtivo.tipo) && donoId !== usuarioAtivo.sub) {
            throw new UnauthorizedAccessException('Só o dono da atividade, o auxiliar ou o gestor muda a atividade de demanda');
        }
        // Quem não vê o projeto da demanda de destino recebe a mesma "não encontrada" que quando ela não existe (mesmo recorte da leitura HTTP);
        // existência e situação só são respondidas a quem a vê. Ver não basta: o desenvolvedor também precisa ser membro (403 abaixo).
        const demandaDestino = await this.demandaRepositorio.recuperar(
            { id: demandaDestinoId },
            temVisibilidadeTotal(usuarioAtivo.tipo) ? undefined : { usuarioId: usuarioAtivo.sub },
        );
        if (!demandaDestino) {
            throw new ResourceNotFoundException('Demanda de destino');
        }
        if (demandaDestino.status === TipoDemandaStatusEnum.CONCLUIDA || demandaDestino.status === TipoDemandaStatusEnum.CANCELADA) {
            throw new BusinessException(`A demanda de destino está ${demandaDestino.status === TipoDemandaStatusEnum.CONCLUIDA ? 'concluída' : 'cancelada'}: escolha uma demanda em aberto`);
        }
        if (!temVisibilidadeTotal(usuarioAtivo.tipo)) {
            const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({ demandaId: demandaDestinoId, usuarioId: usuarioAtivo.sub });
            if (!temAcesso) {
                throw new UnauthorizedAccessException('Usuário não tem acesso à demanda de destino');
            }
        }
    }

    /**
   * Realiza soft delete da atividade. A rota é de quem edita atividade de outro (`@ExigePermissao`); a regra também mora aqui porque a IA exclui pelo executor (task 230):
   * gestor, ou o dono da atividade.
   */
    async excluir(dto: AtividadeRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
        const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
        if (!atividadeEncontrada) {
            throw new ResourceNotFoundException('Atividade');
        }
        if (!podeEditarAtividadeDeOutro(usuarioAtivo.tipo) && atividadeEncontrada.usuarioId !== usuarioAtivo.sub) {
            throw new UnauthorizedAccessException('Só o dono da atividade, o auxiliar ou o gestor exclui a atividade');
        }
        // Com execução registrada a atividade é histórico de trabalho: o excluir não existe para ninguém (task 378).
        if (await this.atividadeRepositorio.possuiExecucao({ id: dto.id })) {
            throw new BusinessException('Atividade com execução registrada não pode ser excluída');
        }

        await this.atividadeRepositorio.excluir({ id: dto.id });

        return {
            sucesso:  true,
            dados:    null,
            mensagem: 'Atividade excluída com sucesso',
        };
    }

    /** Restaura a atividade excluída (soft delete revertido, sem cascata). Rota e IA com a mesma regra: o dono da atividade ou quem conduz o trabalho (tasks 230 e 378). */
    async restaurar(dto: AtividadeRestaurarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<AtividadeRestauradaDto>> {
        const atividadeExcluida = await this.atividadeRepositorio.recuperarExcluida({ id: dto.id });
        if (!atividadeExcluida) {
            throw new ResourceNotFoundException('Atividade');
        }
        if (!podeEditarAtividadeDeOutro(usuarioAtivo.tipo) && atividadeExcluida.usuarioId !== usuarioAtivo.sub) {
            throw new UnauthorizedAccessException('Só o dono da atividade, o auxiliar ou o gestor restaura a atividade');
        }

        if (!atividadeExcluida.demandaAtiva) {
            throw new BusinessException('A demanda desta atividade foi excluída; restaure a demanda antes de restaurar a atividade');
        }

        const atividadeRestaurada = await this.atividadeRepositorio.restaurar({ id: dto.id });

        return {
            sucesso:  true,
            dados:    atividadeRestaurada,
            mensagem: 'Atividade restaurada com sucesso',
        };
    }

    /**
   * Sincroniza as tags de uma atividade com a lista enviada.
   * O desenvolvedor só altera as tags das próprias atividades; auxiliar, gestor e administrador alteram as de qualquer um.
   */
    async alterarTags(
        dto: AtividadeTagsAtribuirDto & { id: number },
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<AtividadeTagsAtribuidasDto>> {
        const atividadeId = dto.id;

        const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: atividadeId });
        if (!atividadeEncontrada) {
            throw new ResourceNotFoundException('Atividade');
        }

        // Cada um altera as próprias atividades; só quem conduz o trabalho (auxiliar, gestor, administrador) altera as dos outros. Ser membro da demanda não basta.
        if (atividadeEncontrada.usuarioId !== usuarioAtivo.sub && !podeAtribuirMembroOuTag(usuarioAtivo.tipo)) {
            throw new UnauthorizedAccessException('Só o dono da atividade, o auxiliar ou o gestor altera esta atividade');
        }

        for (const tagId of dto.tagIds) {
            const tagEncontrada = await this.tagRepositorio.recuperar({ id: tagId });
            if (!tagEncontrada) {
                throw new ResourceNotFoundException(`Tag com id ${tagId}`);
            }
        }

        await this.atividadeRepositorio.alterarTags({ atividadeId, tagIds: dto.tagIds });

        const tagsAlteradas = await this.atividadeRepositorio.listarTags({ atividadeId });

        return {
            sucesso:  true,
            dados:    { atividadeId, tags: tagsAlteradas },
            mensagem: 'Tags da atividade alteradas com sucesso',
        };
    }

    /**
   * Lista as tags ativas de uma atividade.
   */
    async listarTags(
        dto: AtividadeRecuperarDto,
        usuarioAtivo: JwtPayload,
    ): Promise<StandardResponse<TagResumoDto[]>> {
        const atividadeEncontrada = await this.atividadeRepositorio.recuperar({ id: dto.id });
        if (!atividadeEncontrada) {
            throw new ResourceNotFoundException('Atividade');
        }

        if (!temVisibilidadeTotal(usuarioAtivo.tipo)) {
            const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
                demandaId: atividadeEncontrada.demandaId,
                usuarioId: usuarioAtivo.sub,
            });
            if (!temAcesso) {
                throw new UnauthorizedAccessException('Usuário não tem acesso à demanda desta atividade');
            }
        }

        const tags = await this.atividadeRepositorio.listarTags({ atividadeId: dto.id });

        return {
            sucesso:  true,
            dados:    tags,
            mensagem: 'Tags da atividade listadas com sucesso',
        };
    }
}
