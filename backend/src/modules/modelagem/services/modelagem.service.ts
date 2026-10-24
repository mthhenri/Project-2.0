import { Injectable } from '@nestjs/common';
import {
  ModelagemDiagramaDto,
  ModelagemGrupoAlteradoDto,
  ModelagemGrupoCriadoDto,
  ModelagemGrupoCriarDto,
  ModelagemGrupoDto,
  ModelagemGrupoExcluirDto,
  ModelagemGrupoInternoAlterarDto,
  ModelagemTabelaAlteradaDto,
  ModelagemTabelaDto,
  ModelagemTabelaInternoAlterarDto,
  ModelagemTabelaRemoverDto,
  StandardResponse,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { montarDiagrama, montarModelo, posicionar, posicionarTabelaNova, resolverGrupos, TabelaDoCatalogo } from '../domain/modelagem';
import { CONFIGURACAO_MODELAGEM } from '../domain/modelagem.configuracao';
import { ModelagemCatalogoRepository } from '../repositories/modelagem-catalogo.repository';
import { ModelagemGrupoRepository } from '../repositories/modelagem-grupo.repository';
import { ModelagemTabelaRepository } from '../repositories/modelagem-tabela.repository';

/** O schema só muda numa migration (a cada deploy), então o catálogo lido fica em memória por pouco tempo. Grupos e posições nunca ficam em cache. */
const TEMPO_DO_CACHE_MS = 60_000;
/** A paleta do diagrama tem 7 cores para grupos (0 a 6); o 7 é do "Sem grupo". */
const QUANTIDADE_DE_CORES_DE_GRUPO = 7;

interface CatalogoLido {
  tabelas: TabelaDoCatalogo[];
  ultimaMigration: string | null;
  expiraEm: number;
}

/**
 * Diagrama da modelagem do banco (tela Modelagem): o catálogo do PostgreSQL (tabelas, colunas, chaves) mais os grupos e as posições
 * que o gestor guardou em `modelagem_grupo` e `modelagem_tabela`: a organização é do gestor e o banco só traz o visual (tabela do banco sem
 * linha guardada fica "fora da modelagem", no canto). Qualquer usuário autenticado vê; só o gestor cria, renomeia e exclui grupos, põe e tira
 * tabelas da modelagem e muda o grupo e a posição delas (a permissão está nas rotas).
 */
@Injectable()
export class ModelagemService {
  private catalogo: CatalogoLido | null = null;

  constructor(
    private readonly catalogoRepository: ModelagemCatalogoRepository,
    private readonly grupoRepository: ModelagemGrupoRepository,
    private readonly tabelaRepository: ModelagemTabelaRepository,
  ) {}

  async obterDiagrama(): Promise<StandardResponse<ModelagemDiagramaDto>> {
    const diagrama = await this.montarDiagramaAtual();
    return { sucesso: true, dados: diagrama, mensagem: 'Modelagem consultada com sucesso' };
  }

  async criarGrupo(dto: ModelagemGrupoCriarDto): Promise<StandardResponse<ModelagemGrupoCriadoDto>> {
    const titulo = dto.titulo.trim();
    const rotulo = dto.rotulo.trim();
    this.validarTextos(titulo, rotulo);
    await this.validarRotuloDisponivel(rotulo);

    const grupos = await this.grupoRepository.listar();
    const ordem = (await this.grupoRepository.obterMaiorOrdem()) + 1;
    const corIndice = this.escolherCorMenosUsada(grupos);
    const criado = await this.recusarRotuloRepetido(() => this.grupoRepository.inserir({ titulo, rotulo, ordem, corIndice }));
    return { sucesso: true, dados: criado, mensagem: 'Grupo criado com sucesso' };
  }

  async alterarGrupo(dto: ModelagemGrupoInternoAlterarDto): Promise<StandardResponse<ModelagemGrupoAlteradoDto>> {
    const titulo = dto.titulo.trim();
    const rotulo = dto.rotulo.trim();
    this.validarTextos(titulo, rotulo);
    await this.validarGrupoExiste(dto.id);
    await this.validarRotuloDisponivel(rotulo, dto.id);

    const alterado = await this.recusarRotuloRepetido(() => this.grupoRepository.alterar({ id: dto.id, titulo, rotulo }));
    if (!alterado) throw new ResourceNotFoundException('Grupo não encontrado');
    return { sucesso: true, dados: alterado, mensagem: 'Grupo alterado com sucesso' };
  }

  async excluirGrupo(dto: ModelagemGrupoExcluirDto): Promise<StandardResponse<void>> {
    await this.validarGrupoExiste(dto.id);
    // Conta pelo diagrama resolvido: a tabela `tipo_*` sem linha guardada que herda este grupo também é membro dele.
    const { tabelas } = await this.resolverTabelas();
    if (tabelas.some((tabela) => tabela.grupoId === dto.id)) {
      throw new BusinessException('Mova as tabelas do grupo para outro antes de excluí-lo');
    }
    await this.grupoRepository.excluir({ id: dto.id });
    return { sucesso: true, dados: null, mensagem: 'Grupo excluído com sucesso' };
  }

  /**
   * Põe a tabela na modelagem (precisa de um grupo; sem posição, ela cai embaixo das do grupo) ou muda o grupo e/ou a posição de uma que
   * já está nela. O que a chamada não traz (`undefined`) fica como está agora no servidor: arrastar não desfaz uma troca de grupo, e
   * trocar o grupo não desfaz a posição.
   */
  async alterarTabela(dto: ModelagemTabelaInternoAlterarDto): Promise<StandardResponse<ModelagemTabelaAlteradaDto>> {
    if (dto.grupoId === undefined && dto.x === undefined) throw new BusinessException('Informe o grupo ou a posição da tabela');
    await this.validarTabelaExiste(dto.nomeTabela);
    if (dto.grupoId !== undefined) await this.validarGrupoExiste(dto.grupoId);

    const { tabelas } = await this.resolverTabelas();
    const atual = tabelas.find((tabela) => tabela.nome === dto.nomeTabela) as ModelagemTabelaDto;
    const foraDaModelagem = atual.grupoId === null;
    if (foraDaModelagem && dto.grupoId === undefined) throw new BusinessException('Escolha um grupo para colocar a tabela na modelagem');

    const grupoId = dto.grupoId ?? (atual.grupoId as number);
    const posicaoInicial = foraDaModelagem && dto.x === undefined ? posicionarTabelaNova(grupoId, atual, tabelas.filter((tabela) => tabela.grupoId !== null)) : atual;
    const gravada = await this.tabelaRepository.gravar({ nomeTabela: dto.nomeTabela, grupoId, x: dto.x ?? posicaoInicial.x, y: dto.y ?? posicaoInicial.y });
    return {
      sucesso: true,
      dados: { nome: gravada.nomeTabela, grupoId: gravada.grupoId, x: gravada.x, y: gravada.y },
      mensagem: 'Tabela alterada com sucesso',
    };
  }

  /** Tira a tabela da modelagem: só o desenho muda (a linha de `modelagem_tabela` sai); a tabela do banco continua e reaparece no canto, "Fora da modelagem". */
  async removerTabela(dto: ModelagemTabelaRemoverDto): Promise<StandardResponse<void>> {
    await this.validarTabelaExiste(dto.nomeTabela);
    await this.tabelaRepository.remover({ nomeTabela: dto.nomeTabela });
    return { sucesso: true, dados: null, mensagem: 'Tabela tirada da modelagem com sucesso' };
  }

  private async montarDiagramaAtual(): Promise<ModelagemDiagramaDto> {
    const { tabelas, grupos, catalogo } = await this.resolverTabelas();
    const origem = `PostgreSQL · última migration: ${catalogo.ultimaMigration?.replace(/\.sql$/, '') ?? 'nenhuma aplicada'}`;
    return montarDiagrama(tabelas, grupos, CONFIGURACAO_MODELAGEM, origem);
  }

  /** O catálogo (em cache), os grupos e as posições (sempre frescos) juntos: cada tabela com seu grupo e sua posição. */
  private async resolverTabelas(): Promise<{ tabelas: ModelagemTabelaDto[]; grupos: ModelagemGrupoDto[]; catalogo: CatalogoLido }> {
    const [catalogo, grupos, colocacoes] = await Promise.all([this.obterCatalogo(), this.grupoRepository.listar(), this.tabelaRepository.listar()]);
    const grupoDe = resolverGrupos(catalogo.tabelas, colocacoes, new Set(grupos.map((grupo) => grupo.id)));
    const tabelas = posicionar(catalogo.tabelas, grupoDe, colocacoes);
    return { tabelas, grupos, catalogo };
  }

  /** `forcar` ignora o cache: serve para confirmar que uma tabela inexistente no cache não nasceu numa migration recente. */
  private async obterCatalogo(forcar = false): Promise<CatalogoLido> {
    const agora = Date.now();
    if (!forcar && this.catalogo && this.catalogo.expiraEm > agora) return this.catalogo;
    const [colunas, chavesPrimarias, chavesEstrangeiras, ultimaMigration] = await Promise.all([
      this.catalogoRepository.listarColunas(),
      this.catalogoRepository.listarChavesPrimarias(),
      this.catalogoRepository.listarChavesEstrangeiras(),
      this.catalogoRepository.obterUltimaMigration(),
    ]);
    this.catalogo = {
      tabelas: montarModelo(colunas, chavesPrimarias, chavesEstrangeiras, CONFIGURACAO_MODELAGEM),
      ultimaMigration,
      expiraEm: agora + TEMPO_DO_CACHE_MS,
    };
    return this.catalogo;
  }

  private async validarTabelaExiste(nomeTabela: string): Promise<void> {
    let catalogo = await this.obterCatalogo();
    if (!catalogo.tabelas.some((tabela) => tabela.nome === nomeTabela)) catalogo = await this.obterCatalogo(true);
    if (!catalogo.tabelas.some((tabela) => tabela.nome === nomeTabela)) throw new ResourceNotFoundException('Tabela não encontrada no banco');
  }

  private async validarGrupoExiste(id: number): Promise<void> {
    if (!(await this.grupoRepository.recuperar({ id }))) throw new ResourceNotFoundException('Grupo não encontrado');
  }

  private async validarRotuloDisponivel(rotulo: string, idExcluir?: number): Promise<void> {
    if (await this.grupoRepository.validarRotulo({ rotulo, idExcluir })) throw new BusinessException('Já existe um grupo com esse rótulo');
  }

  /** O índice único do rótulo é a garantia final contra dois pedidos ao mesmo tempo: a violação (23505) vira a mesma mensagem da validação. */
  private async recusarRotuloRepetido<TResultado>(gravar: () => Promise<TResultado>): Promise<TResultado> {
    try {
      return await gravar();
    } catch (erro) {
      if ((erro as { code?: string }).code === '23505') throw new BusinessException('Já existe um grupo com esse rótulo');
      throw erro;
    }
  }

  private validarTextos(titulo: string, rotulo: string): void {
    if (!titulo || !rotulo) throw new BusinessException('Informe o título e o rótulo do grupo');
  }

  /** A cor menos usada entre os grupos ativos (a de menor índice no empate): grupos novos não repetem cor enquanto sobram cores. */
  private escolherCorMenosUsada(grupos: ModelagemGrupoDto[]): number {
    const usos = Array.from({ length: QUANTIDADE_DE_CORES_DE_GRUPO }, (_, indice) => grupos.filter((grupo) => grupo.corIndice === indice).length);
    return usos.indexOf(Math.min(...usos));
  }
}
