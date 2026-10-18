import { Injectable, Logger } from '@nestjs/common';
import {
  EstadoIaEnum,
  MAXIMO_DE_NARRATIVAS,
  NIVEL_DO_TIPO_DE_PROMPT,
  PromptTestadoDto,
  PromptTestarDto,
  PromptTesteSaidaDto,
  StandardResponse,
  temPermissaoDeAdministrador,
  TipoPromptEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { IaException } from '../../ia/domain/ia.exception';
import { IaService } from '../../ia/services/ia.service';
import {
  MAXIMO_DE_CARACTERES_DA_NARRATIVA,
  MAXIMO_TOKENS_DO_TESTE,
} from '../domain/prompt-teste';
import { PromptService } from './prompt.service';

const MENSAGEM_GENERICA = 'Serviço de IA temporariamente indisponível';

/**
 * Teste de prompt antes de salvar (task 140): roda cada narrativa duas vezes, com o prompt **ativo** e com o **candidato**, no nível do
 * tipo. Só texto: sem ferramentas, sem proposta e sem gravar nada (nem no chat). A falha de uma chamada vira o erro daquela saída; as
 * demais seguem.
 */
@Injectable()
export class PromptTesteService {
  private readonly logger = new Logger(PromptTesteService.name);

  constructor(
    private readonly promptService: PromptService,
    private readonly iaService: IaService,
  ) {}

  async testar(tipo: TipoPromptEnum, dto: PromptTestarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PromptTestadoDto>> {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Apenas administradores podem testar prompts');
    const narrativas = this.validarEntrada(dto);
    if ((await this.iaService.obterEstado()) === EstadoIaEnum.DESLIGADA) throw new ConflictException('A IA está desligada');

    const ativo = await this.promptService.obterAtivo(tipo);
    const nivel = NIVEL_DO_TIPO_DE_PROMPT[tipo];
    const resultados: PromptTestadoDto['resultados'] = [];
    // Uma narrativa por vez (no máximo 10 chamadas no total); as duas respostas de cada uma em paralelo.
    for (const narrativa of narrativas) {
      const [saidaAtiva, saidaCandidata] = await Promise.all([
        this.rodar(nivel, ativo.conteudo, narrativa),
        this.rodar(nivel, dto.conteudo, narrativa),
      ]);
      resultados.push({ narrativa, ativo: saidaAtiva, candidato: saidaCandidata });
    }
    return { sucesso: true, dados: { nivel, resultados }, mensagem: 'Prompt testado com sucesso' };
  }

  private validarEntrada(dto: PromptTestarDto): string[] {
    if (dto.conteudo.trim() === '') throw new BusinessException('O prompt a testar não pode ficar vazio');
    const narrativas = dto.narrativas.map((narrativa) => narrativa.trim()).filter((narrativa) => narrativa !== '');
    if (narrativas.length === 0) throw new BusinessException('Informe ao menos uma narrativa para o teste');
    if (narrativas.length > MAXIMO_DE_NARRATIVAS) throw new BusinessException(`O teste aceita no máximo ${MAXIMO_DE_NARRATIVAS} narrativas`);
    if (narrativas.some((narrativa) => narrativa.length > MAXIMO_DE_CARACTERES_DA_NARRATIVA)) {
      throw new BusinessException(`Cada narrativa pode ter no máximo ${MAXIMO_DE_CARACTERES_DA_NARRATIVA} caracteres`);
    }
    return narrativas;
  }

  private async rodar(nivel: PromptTestadoDto['nivel'], instrucoes: string, narrativa: string): Promise<PromptTesteSaidaDto> {
    try {
      const resposta = await this.iaService.gerar({
        nivel,
        instrucoes,
        mensagens: [{ papel: 'usuario', conteudo: narrativa }],
        maximoTokens: MAXIMO_TOKENS_DO_TESTE,
      });
      return { texto: resposta.texto, erro: null, tokensEntrada: resposta.tokens.entrada, tokensSaida: resposta.tokens.saida };
    } catch (erro) {
      if (!(erro instanceof IaException)) {
        this.logger.error(`Falha no teste de prompt: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
      const mensagem = erro instanceof IaException ? erro.mensagem : MENSAGEM_GENERICA;
      return { texto: null, erro: mensagem, tokensEntrada: 0, tokensSaida: 0 };
    }
  }
}
