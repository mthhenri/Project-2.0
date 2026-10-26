import { Injectable } from '@nestjs/common';
import { PlanoConsultarDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { PlanoService } from '../services/plano.service';

/**
 * Relê o documento do plano com a versão de agora (conversa do planejamento, task 234). Roda em nome do usuário: quem não pode ver o plano não o
 * lê, e a descrição do cliente nem vem para o desenvolvedor (`PlanoService.recuperar`).
 */
@Injectable()
export class ConsultarPlanoFerramenta extends FerramentaIa<PlanoConsultarDto> {
  readonly nome = 'consultar_plano';
  readonly descricao =
    'Lê o documento do plano aberto: título, projeto, demanda ligada, a versão de agora e o texto das abas (descrição técnica, descrição do cliente e documentação). ' +
    'O documento e a versão também vêm no começo da conversa; use esta ferramenta para reler depois de uma escrita, de uma alteração ou quando a escrita for recusada por versão antiga. ' +
    'Copie daqui o trecho exato antes de propor alterá-lo.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly somentePlanejamento = true;
  readonly classeDeEntrada = PlanoConsultarDto;

  constructor(private readonly planoService: PlanoService) {
    super();
  }

  async executar(entrada: PlanoConsultarDto, usuarioAtivo: JwtPayload): Promise<unknown> {
    const plano = (await this.planoService.recuperar({ id: entrada.planoId }, usuarioAtivo)).dados;
    if (!plano) throw new BusinessException('Plano não encontrado');
    return {
      planoId: plano.id,
      titulo: plano.titulo,
      projeto: plano.projetoNome,
      demanda: plano.demandaNome,
      versao: plano.versao,
      descricaoTecnica: plano.descricaoTecnica,
      ...('descricaoCliente' in plano ? { descricaoCliente: plano.descricaoCliente } : {}),
      documentacao: plano.documentacao,
    };
  }
}
