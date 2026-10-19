import { Injectable } from '@nestjs/common';
import {
  AnotacaoAlteradaDto,
  AnotacaoAlterarDto,
  AnotacaoFeitoAnexadoDto,
  AnotacaoFeitoAnexarDto,
  AnotacaoListarDto,
  AnotacaoRecuperarDto,
  AnotacaoResumoDto,
  AnotacaoTextoAnexadoDto,
  AnotacaoTextoAnexarDto,
  AnotacaoTrechoMoverDto,
  AnotacaoTrechoMovidoDto,
  AnotacaoTrechoTrocadoDto,
  AnotacaoTrechoTrocarDto,
  diaMesNoFuso,
  StandardResponse,
  temPermissaoDeGestor,
  TipoAnotacaoEnum,
} from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AnotacaoRepository } from '../repositories/anotacao.repository';
import {
  anexarAoFeitoDoDia,
  anexarAoFim,
  mesmaVersao,
  removerTrechoUnico,
  ResultadoDeTrecho,
  substituirTrechoUnico,
} from '../domain/anotacao-texto';

@Injectable()
export class AnotacaoService {
  constructor(
    private readonly anotacaoRepositorio: AnotacaoRepository,
    private readonly configService: ConfigService,
  ) {}

  /** Seções do pad (todas, ou só as pedidas), na ordem de exibição. */
  async listar(dto: AnotacaoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<AnotacaoResumoDto[]>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const itens = await this.anotacaoRepositorio.listar(dto);
    if (itens.length === 0) throw new ResourceNotFoundException('Anotações');

    return { sucesso: true, dados: itens, mensagem: 'Anotações listadas com sucesso' };
  }

  /** Substitui a seção inteira, só se ela ainda está como a tela a leu. */
  async alterar(
    dto: AnotacaoAlterarDto & AnotacaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AnotacaoAlteradaDto>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const [gravada] = await this.anotacaoRepositorio.modificarSecoes(
      { usuarioId: dto.usuarioId, tipos: [dto.tipo] },
      ([atual]) => {
        this.validarSecao(atual);
        this.validarVersao(atual, dto.updatedDateLido);
        return [{ tipo: dto.tipo, texto: dto.texto }];
      },
    );

    return { sucesso: true, dados: gravada, mensagem: 'Anotação alterada com sucesso' };
  }

  /** Edição pontual: troca um trecho (que aparece uma única vez) por outro. */
  async trocarTrecho(
    dto: AnotacaoTrechoTrocarDto & AnotacaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AnotacaoTrechoTrocadoDto>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const [gravada] = await this.anotacaoRepositorio.modificarSecoes(
      { usuarioId: dto.usuarioId, tipos: [dto.tipo] },
      ([atual]) => {
        this.validarSecao(atual);
        if (dto.updatedDateLido) this.validarVersao(atual, dto.updatedDateLido);
        const resultado = substituirTrechoUnico(atual.texto, dto.trechoAntigo, dto.trechoNovo);
        return [{ tipo: dto.tipo, texto: this.textoOuErro(resultado) }];
      },
    );

    return { sucesso: true, dados: gravada, mensagem: 'Trecho trocado com sucesso' };
  }

  /** Anexa um texto ao fim da seção. */
  async anexarTexto(
    dto: AnotacaoTextoAnexarDto & AnotacaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AnotacaoTextoAnexadoDto>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const [gravada] = await this.anotacaoRepositorio.modificarSecoes(
      { usuarioId: dto.usuarioId, tipos: [dto.tipo] },
      ([atual]) => {
        this.validarSecao(atual);
        return [{ tipo: dto.tipo, texto: anexarAoFim(atual.texto, dto.texto) }];
      },
    );

    return { sucesso: true, dados: gravada, mensagem: 'Texto anexado com sucesso' };
  }

  /** Escreve na seção Feito, debaixo do título do dia de hoje (`## dd/MM`, no fuso do sistema). */
  async anexarFeito(
    dto: AnotacaoFeitoAnexarDto & Pick<AnotacaoRecuperarDto, 'usuarioId'>,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AnotacaoFeitoAnexadoDto>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const diaMes = diaMesNoFuso(new Date(), this.configService.obter().aplicacao.fusoHorario);
    const [gravada] = await this.anotacaoRepositorio.modificarSecoes(
      { usuarioId: dto.usuarioId, tipos: [TipoAnotacaoEnum.FEITO] },
      ([atual]) => {
        this.validarSecao(atual);
        return [{ tipo: TipoAnotacaoEnum.FEITO, texto: anexarAoFeitoDoDia(atual.texto, diaMes, dto.texto) }];
      },
    );

    return { sucesso: true, dados: gravada, mensagem: 'Feito anotado com sucesso' };
  }

  /** Move um trecho de uma seção para o fim de outra, nas duas ou em nenhuma. */
  async moverTrecho(
    dto: AnotacaoTrechoMoverDto & Pick<AnotacaoRecuperarDto, 'usuarioId'>,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AnotacaoTrechoMovidoDto>> {
    await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    if (dto.tipoOrigem === dto.tipoDestino) {
      throw new BusinessException('A seção de destino deve ser diferente da de origem');
    }

    const [origemGravada, destinoGravado] = await this.anotacaoRepositorio.modificarSecoes(
      { usuarioId: dto.usuarioId, tipos: [dto.tipoOrigem, dto.tipoDestino] },
      (atuais) => {
        const origem = atuais.find((secao) => secao.tipo === dto.tipoOrigem);
        const destino = atuais.find((secao) => secao.tipo === dto.tipoDestino);
        this.validarSecao(origem);
        this.validarSecao(destino);
        this.validarVersao(origem, dto.updatedDateOrigemLido);
        this.validarVersao(destino, dto.updatedDateDestinoLido);

        const textoDaOrigem = this.textoOuErro(removerTrechoUnico(origem.texto, dto.trecho));
        return [
          { tipo: dto.tipoOrigem, texto: textoDaOrigem },
          { tipo: dto.tipoDestino, texto: anexarAoFim(destino.texto, dto.trecho) },
        ];
      },
    );

    return {
      sucesso:  true,
      dados:    { origem: origemGravada, destino: destinoGravado },
      mensagem: 'Trecho movido com sucesso',
    };
  }

  /** O dono acessa o próprio pad; gestor e administrador, o de qualquer um. */
  /**
   * Cada um acessa o próprio pad; gestor e administrador também o dos **desenvolvedores**, nunca o de outro gestor ou administrador
   * (task 195). O desenvolvedor só o próprio. Pad de usuário que não existe é 404, sem dizer que o usuário existe ou não.
   */
  private async validarAcesso(usuarioId: number, usuarioAtivo: JwtPayload): Promise<void> {
    if (usuarioAtivo.sub === usuarioId) return;
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Desenvolvedor acessa apenas o próprio pad');
    }
    const tipoDoDono = await this.anotacaoRepositorio.recuperarTipoDoDono({ usuarioId });
    if (!tipoDoDono) throw new ResourceNotFoundException('Anotações');
    if (temPermissaoDeGestor(tipoDoDono)) {
      throw new UnauthorizedAccessException('O pad de outro gestor ou administrador é só dele');
    }
  }

  /** Falta a seção quando o usuário não existe (ou não tem as 5 linhas). */
  private validarSecao(secao: AnotacaoResumoDto | undefined): asserts secao is AnotacaoResumoDto {
    if (!secao) throw new ResourceNotFoundException('Anotação');
  }

  private validarVersao(atual: AnotacaoResumoDto, updatedDateLido: Date): void {
    if (!mesmaVersao(atual.updatedDate, updatedDateLido)) {
      throw new ConflictException('A seção foi alterada em outro lugar; recarregue e tente de novo');
    }
  }

  private textoOuErro(resultado: ResultadoDeTrecho): string {
    if ('texto' in resultado) return resultado.texto;
    throw new BusinessException(
      resultado.motivo === 'AUSENTE'
        ? 'O trecho não foi encontrado na seção'
        : 'O trecho aparece mais de uma vez na seção; informe um trecho maior',
    );
  }
}
