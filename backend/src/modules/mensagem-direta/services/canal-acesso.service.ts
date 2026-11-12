import { Injectable } from '@nestjs/common';
import { GrupoCanalRecuperarDto, GrupoListarDto, TipoGrupoEnum, grupoEhCanal, temPermissaoDeGestor } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { GrupoMembroRegistrado, GrupoRegistrado, GrupoRepository } from '../repositories/grupo.repository';

/** A demanda ou o projeto a que um canal pertence, com o nome de hoje (o canal acompanha a renomeação). */
export interface AlvoDoCanal {
    nome: string;
    projetoId: number;
}

/**
 * Quem tem acesso a um grupo (task 248). No grupo livre os membros são as linhas de `grupo_membro`. No **canal** de demanda ou de projeto, o acesso do
 * desenvolvedor **vem de `demanda_usuario`** (a fonte da verdade, lida pelo `DemandaRepository`, a mesma que `DemandaService` usa) e nunca é copiado
 * para o canal: tirar a pessoa da demanda tira o canal dela, com o histórico, na hora. Gestor e administrador não são membros por `demanda_usuario`:
 * leem por tipo e só passam a contar como membros (uma linha em `grupo_membro`) quando escrevem. Uma regra só, usada pela lista, pelo envio, pela
 * leitura e pela supervisão.
 */
@Injectable()
export class CanalAcessoService {
    constructor(
        private readonly grupoRepositorio: GrupoRepository,
        private readonly demandaRepositorio: DemandaRepository,
        private readonly projetoRepositorio: ProjetoRepository,
        private readonly usuarioRepositorio: UsuarioRepository,
    ) {}

    /**
     * O alvo (nome de hoje e projeto) de cada canal entre os grupos informados. O grupo livre não entra; canal cuja demanda ou projeto foi excluído também
     * não: quem chama trata a ausência como "o canal não existe mais".
     */
    async resolverAlvos(grupos: GrupoRegistrado[]): Promise<Map<number, AlvoDoCanal>> {
        const canais = grupos.filter((grupo) => grupoEhCanal(grupo.tipo));
        const demandaIds = [...new Set(canais.filter((canal) => canal.demandaId !== null).map((canal) => canal.demandaId as number))];
        const projetoIds = [...new Set(canais.filter((canal) => canal.demandaId === null && canal.projetoId !== null).map((canal) => canal.projetoId as number))];
        const [demandas, projetos] = await Promise.all([
            this.demandaRepositorio.listarNomesDeDemandas({ demandaIds }),
            this.projetoRepositorio.listarNomesPorIds({ projetoIds }),
        ]);
        const demandaPorId = new Map(demandas.map((demanda) => [demanda.id, demanda]));
        const projetoPorId = new Map(projetos.map((projeto) => [projeto.id, projeto]));

        const alvos = new Map<number, AlvoDoCanal>();
        for (const canal of canais) {
            if (canal.demandaId !== null) {
                const demanda = demandaPorId.get(canal.demandaId);
                if (demanda) alvos.set(canal.grupoId, { nome: demanda.nome, projetoId: demanda.projetoId });
            } else if (canal.projetoId !== null) {
                const projeto = projetoPorId.get(canal.projetoId);
                if (projeto) alvos.set(canal.grupoId, { nome: projeto.nome, projetoId: projeto.id });
            }
        }
        return alvos;
    }

    async listarMembros(grupo: GrupoRegistrado): Promise<GrupoMembroRegistrado[]> {
        return this.listarMembrosDeGrupos([grupo]);
    }

    /**
     * Os membros atuais de cada grupo, do que entrou primeiro ao último. No grupo livre, as linhas de `grupo_membro`. No canal, as pessoas atribuídas
     * (`demanda_usuario`) à demanda, ou a alguma demanda do projeto, mais quem tem linha em `grupo_membro` (o gestor que escreveu). Quem tem poder de
     * gestor nunca entra pelo lado de `demanda_usuario`.
     */
    async listarMembrosDeGrupos(grupos: GrupoRegistrado[]): Promise<GrupoMembroRegistrado[]> {
        if (grupos.length === 0) return [];
        const linhas = await this.grupoRepositorio.listarMembrosDeGrupos({ grupoIds: grupos.map((grupo) => grupo.grupoId) });
        const canais = grupos.filter((grupo) => grupoEhCanal(grupo.tipo));
        if (canais.length === 0) return linhas;

        const canalPorDemanda = new Map(canais.filter((canal) => canal.demandaId !== null).map((canal) => [canal.demandaId as number, canal.grupoId]));
        const canalPorProjeto = new Map(canais.filter((canal) => canal.demandaId === null && canal.projetoId !== null).map((canal) => [canal.projetoId as number, canal.grupoId]));
        const [atribuidosAsDemandas, atribuidosAosProjetos, comPoderDeGestor, ativos] = await Promise.all([
            this.demandaRepositorio.listarMembrosDeDemandas({ demandaIds: [...canalPorDemanda.keys()] }),
            this.demandaRepositorio.listarMembrosDeProjetos({ projetoIds: [...canalPorProjeto.keys()] }),
            this.usuarioRepositorio.listarIdsComPermissaoDeGestor(),
            this.usuarioRepositorio.listarAtivos(),
        ]);
        const comPoder = new Set(comPoderDeGestor);
        const gestoresAtivos = new Set(ativos.filter((usuario) => temPermissaoDeGestor(usuario.tipo)).map((usuario) => usuario.id));
        const idsDosCanais = new Set(canais.map((canal) => canal.grupoId));
        // Só gestor e administrador ativos têm linha válida em `grupo_membro` num canal: a de quem deixou de ser gestor, ou foi inativado, não conta.
        const proprios = linhas.filter((linha) => !idsDosCanais.has(linha.grupoId) || gestoresAtivos.has(linha.usuarioId));

        const derivados: GrupoMembroRegistrado[] = [
            ...atribuidosAsDemandas.map((acesso) => ({ grupoId: canalPorDemanda.get(acesso.alvoId) as number, usuarioId: acesso.usuarioId, entradaData: acesso.entradaData, saidaData: null })),
            ...atribuidosAosProjetos.map((acesso) => ({ grupoId: canalPorProjeto.get(acesso.alvoId) as number, usuarioId: acesso.usuarioId, entradaData: acesso.entradaData, saidaData: null })),
        ].filter((membro) => !comPoder.has(membro.usuarioId));

        const vistos = new Set<string>();
        return [...proprios, ...derivados]
            .filter((membro) => {
                const chave = `${membro.grupoId}:${membro.usuarioId}`;
                if (vistos.has(chave)) return false;
                vistos.add(chave);
                return true;
            })
            .sort((primeiro, segundo) => primeiro.entradaData.getTime() - segundo.entradaData.getTime() || primeiro.usuarioId - segundo.usuarioId);
    }

    /** Os canais já criados que o **desenvolvedor** acessa por `demanda_usuario`: o de cada demanda em que está e o de cada projeto que tem uma demanda dele. */
    async listarCanaisDoUsuario(dto: GrupoListarDto): Promise<GrupoRegistrado[]> {
        const acessos = await this.demandaRepositorio.listarAcessosDoUsuario({ usuarioId: dto.usuarioId });
        if (acessos.length === 0) return [];
        return this.grupoRepositorio.listarCanais({
            demandaIds: [...new Set(acessos.map((acesso) => acesso.demandaId))],
            projetoIds: [...new Set(acessos.map((acesso) => acesso.projetoId))],
        });
    }

    /**
     * Quem pode abrir o canal de uma demanda ou de um projeto. Gestor e administrador, sempre. Os demais precisam estar **na própria demanda** (a mesma
     * checagem de `DemandaService`) ou, no projeto, ter ao menos uma demanda nele. Devolve o alvo com o nome de hoje; `404` se não existe e `403` se não há acesso.
     */
    async validarAcessoAoAlvo(dto: GrupoCanalRecuperarDto, usuarioAtivo: JwtPayload): Promise<AlvoDoCanal> {
        const porTipo = temPermissaoDeGestor(usuarioAtivo.tipo);
        if (dto.tipo === TipoGrupoEnum.DEMANDA) {
            const demanda = await this.demandaRepositorio.recuperar({ id: dto.alvoId });
            if (!demanda) throw new ResourceNotFoundException('Demanda');
            // O soft delete do projeto não se propaga às demandas: sem o projeto, a demanda não tem chat.
            if (!(await this.projetoRepositorio.recuperar({ id: demanda.projetoId }))) throw new ResourceNotFoundException('Projeto');
            if (!porTipo && !(await this.demandaRepositorio.validarMembro({ demandaId: demanda.id, usuarioId: usuarioAtivo.sub }))) {
                throw new UnauthorizedAccessException('Você não é membro desta demanda');
            }
            return { nome: demanda.nome, projetoId: demanda.projetoId };
        }
        const projeto = await this.projetoRepositorio.recuperar({ id: dto.alvoId });
        if (!projeto) throw new ResourceNotFoundException('Projeto');
        if (!porTipo && !(await this.demandaRepositorio.validarAcessoProjeto({ projetoId: projeto.id, usuarioId: usuarioAtivo.sub }))) {
            throw new UnauthorizedAccessException('Você não tem acesso a este projeto');
        }
        return { nome: projeto.nome, projetoId: projeto.id };
    }
}
