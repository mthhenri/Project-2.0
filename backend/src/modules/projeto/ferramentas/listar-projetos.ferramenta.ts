import { Injectable } from '@nestjs/common';
import { ProjetosListadosDto, ProjetosListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ProjetoService } from '../services/projeto.service';

/** Quantos projetos voltam de uma vez à IA. */
export const LIMITE_PROJETOS_DA_FERRAMENTA = 50;

/**
 * Os projetos que o usuário vê (o gestor vê todos; o desenvolvedor, os em que tem demanda), com o id que `listar_demandas_do_projeto` e
 * `propor_criar_demanda` pedem. Chama a `ProjetoService` com o usuário do token: as mesmas regras da tela de projetos.
 */
@Injectable()
export class ListarProjetosFerramenta extends FerramentaIa<ProjetosListarDto> {
  readonly nome = 'listar_projetos';
  readonly descricao =
    'Lista os projetos que o usuário pode ver, com id, nome, código e situação. Use para achar o projetoId certo e para ver se um projeto já existe antes de propor criá-lo.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = ProjetosListarDto;

  constructor(private readonly projetoService: ProjetoService) {
    super();
  }

  async executar(_entrada: ProjetosListarDto, usuarioAtivo: JwtPayload): Promise<ProjetosListadosDto> {
    const listados = (await this.projetoService.listar({ allRows: true }, usuarioAtivo)).dados?.itens ?? [];
    return {
      projetos: listados.slice(0, LIMITE_PROJETOS_DA_FERRAMENTA).map((projeto) => ({ id: projeto.id, nome: projeto.nome, codigo: projeto.codigo, status: projeto.status })),
      total: listados.length,
      haMais: listados.length > LIMITE_PROJETOS_DA_FERRAMENTA,
    };
  }
}
