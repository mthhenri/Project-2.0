import { Injectable } from '@nestjs/common';
import { ProporCriarProjetoDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { derivarCodigoDoProjeto, escolherCorDoProjeto } from '../domain/dados-do-projeto-proposto';
import { ProjetoRepository } from '../repositories/projeto.repository';

/**
 * Propõe criar um projeto; **não cria nada** (só o clique de Confirmar no cartão cria). Só o gestor cria projetos, como na tela. Sem
 * código ou cor, a proposta já leva os que a IA derivou, para o cartão mostrar e o usuário ajustar.
 */
@Injectable()
export class ProporCriarProjetoFerramenta extends FerramentaPropostaIa<ProporCriarProjetoDto> {
  readonly nome = 'propor_criar_projeto';
  readonly descricao =
    'Propõe criar UM projeto (nome obrigatório; código e cor são opcionais e a ferramenta escolhe se faltarem; datas só se o usuário disser). ' +
    'Nada é criado até o usuário confirmar no cartão. Antes de propor, use listar_projetos para ver se já existe um projeto com esse nome. ' +
    'O resultado traz o propostaId: para já propor demandas dentro do projeto novo, use esse id em projetoPropostaId de propor_criar_demanda.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporCriarProjetoDto;
  readonly tipoProposta = TipoPropostaIaEnum.CRIAR_PROJETO;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly projetoRepositorio: ProjetoRepository,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporCriarProjetoDto, _usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    let codigo = (entrada.codigo ?? derivarCodigoDoProjeto(entrada.nome)).trim().toUpperCase();
    if (await this.projetoRepositorio.validarCodigo({ codigo })) {
      if (entrada.codigo) throw new BusinessException(`O código ${codigo} já está em uso por outro projeto: escolha outro`);
      // Código derivado do nome que já existe: tenta a variação com número.
      const original = codigo;
      for (let sufixo = 2; sufixo <= 9; sufixo++) {
        codigo = `${original}${sufixo}`;
        if (!(await this.projetoRepositorio.validarCodigo({ codigo }))) break;
        if (sufixo === 9) throw new BusinessException('Não foi possível derivar um código livre: informe um código para o projeto');
      }
    }
    if (entrada.inicioData && entrada.previsaoFimData && entrada.previsaoFimData <= entrada.inicioData) {
      throw new BusinessException('A previsão de fim deve ser posterior à data de início');
    }
    const dados: ProporCriarProjetoDto = { ...entrada, codigo, cor: entrada.cor ?? escolherCorDoProjeto(entrada.nome) };
    return { ...dados };
  }
}
