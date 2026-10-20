import { Inject, Injectable } from '@nestjs/common';
import {
  ConversaDoDesenvolvedorConsultadaDto,
  ConversaDoDesenvolvedorConsultarDto,
  ConversasDoDesenvolvedorBuscadasDto,
  ConversasDoDesenvolvedorBuscarDto,
  ConversasDoDesenvolvedorListadasDto,
  ConversasDoDesenvolvedorListarDto,
  temPermissaoDeGestor,
  TipoUsuarioEnum,
} from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { nomePadraoDaConversa } from '../domain/chat-conversa';
import {
  cortarTexto,
  dentroDoOrcamento,
  diaDentroDoIntervalo,
  ehFalaDaConversa,
  LIMITE_CARACTERES_DA_MENSAGEM,
  LIMITE_CONVERSAS_DO_DESENVOLVEDOR,
  LIMITE_MENSAGENS_DA_BUSCA,
  LIMITE_MENSAGENS_DA_CONVERSA,
  ORCAMENTO_DE_CARACTERES_DA_LISTA,
  somenteMensagensDoChat,
  ultimasMensagens,
} from '../domain/conversa-do-desenvolvedor';
import { ARMAZENAMENTO_DE_CHAT, ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';

/**
 * Leitura das conversas do chat de um **desenvolvedor** pelo gestor ou administrador (as ferramentas da IA do gestor). O dono da
 * conversa não vem do modelo sem conferência: a pessoa precisa existir e ser desenvolvedor, como no pad (task 195), e quem lê precisa ser
 * gestor ou administrador. Só a conversa do chat é lida; o check-in e a instrução interna do sistema ficam de fora.
 */
@Injectable()
export class ChatDesenvolvedorService {
  constructor(
    @Inject(ARMAZENAMENTO_DE_CHAT) private readonly chatMensagemRepositorio: ArmazenamentoDeChat,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {}

  async listarConversas(dto: ConversasDoDesenvolvedorListarDto, usuarioAtivo: JwtPayload): Promise<ConversasDoDesenvolvedorListadasDto> {
    const desenvolvedor = await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const baldes = await this.chatMensagemRepositorio.listarConversas({ usuarioId: dto.usuarioId });
    const noIntervalo = baldes.filter((balde) => diaDentroDoIntervalo(balde.key.slice(-10), dto.inicio, dto.fim));
    const escolhidas = noIntervalo.slice(0, LIMITE_CONVERSAS_DO_DESENVOLVEDOR);
    const titulos = await this.chatMensagemRepositorio.listarTitulos({ usuarioId: dto.usuarioId, conversaIds: escolhidas.map((balde) => balde.key) });
    return {
      usuarioId: desenvolvedor.id,
      usuario: desenvolvedor.nomeCompleto,
      conversas: escolhidas.map((balde) => ({
        data: balde.key.slice(-10),
        titulo: titulos[balde.key]?.titulo || nomePadraoDaConversa(balde.key),
        primeiraMensagem: cortarTexto(balde.primeira.hits.hits[0]?._source.texto ?? '', LIMITE_CARACTERES_DA_MENSAGEM).texto,
        quantidadeDeMensagens: balde.doc_count,
      })),
      haMais: noIntervalo.length > escolhidas.length,
    };
  }

  async consultarConversa(dto: ConversaDoDesenvolvedorConsultarDto, usuarioAtivo: JwtPayload): Promise<ConversaDoDesenvolvedorConsultadaDto> {
    const desenvolvedor = await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const conversaId = `${dto.usuarioId}-${dto.data}`;
    const mensagens = somenteMensagensDoChat(await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: dto.usuarioId })).filter(ehFalaDaConversa);
    const recentes = ultimasMensagens(mensagens, LIMITE_MENSAGENS_DA_CONVERSA);
    const cortadas = recentes.mensagens.map((mensagem) => ({ mensagem, ...cortarTexto(mensagem.texto, LIMITE_CARACTERES_DA_MENSAGEM) }));
    const noOrcamento = dentroDoOrcamento(cortadas, ORCAMENTO_DE_CARACTERES_DA_LISTA, true);
    const titulos = await this.chatMensagemRepositorio.listarTitulos({ usuarioId: dto.usuarioId, conversaIds: [conversaId] });
    return {
      usuarioId: desenvolvedor.id,
      usuario: desenvolvedor.nomeCompleto,
      data: dto.data,
      titulo: titulos[conversaId]?.titulo || nomePadraoDaConversa(conversaId),
      mensagens: noOrcamento.itens.map(({ mensagem, texto, truncada }) => ({ autor: mensagem.autor, texto, truncada, data: mensagem.createdDate.toISOString() })),
      haMais: recentes.haMais || noOrcamento.cortou,
    };
  }

  async buscarMensagens(dto: ConversasDoDesenvolvedorBuscarDto, usuarioAtivo: JwtPayload): Promise<ConversasDoDesenvolvedorBuscadasDto> {
    const desenvolvedor = await this.validarAcesso(dto.usuarioId, usuarioAtivo);
    const achadas = somenteMensagensDoChat(await this.chatMensagemRepositorio.buscar({ usuarioId: dto.usuarioId, texto: dto.texto })).filter(ehFalaDaConversa);
    return {
      usuarioId: desenvolvedor.id,
      usuario: desenvolvedor.nomeCompleto,
      mensagens: dentroDoOrcamento(
        achadas.slice(0, LIMITE_MENSAGENS_DA_BUSCA).map((mensagem) => ({ mensagem, ...cortarTexto(mensagem.texto, LIMITE_CARACTERES_DA_MENSAGEM) })),
        ORCAMENTO_DE_CARACTERES_DA_LISTA,
        false,
      ).itens.map(({ mensagem, texto, truncada }) => ({ data: mensagem.conversaId.slice(-10), autor: mensagem.autor, texto, truncada })),
    };
  }

  /** Gestor ou administrador lendo um desenvolvedor que existe. Outro gestor, administrador ou usuário inexistente: não há conversa a ler. */
  private async validarAcesso(usuarioId: number, usuarioAtivo: JwtPayload): Promise<{ id: number; nomeCompleto: string }> {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Apenas o gestor lê as conversas dos desenvolvedores');
    const dono = await this.usuarioRepositorio.recuperar({ id: usuarioId });
    if (!dono) throw new ResourceNotFoundException('Usuário');
    if (dono.tipo !== TipoUsuarioEnum.DESENVOLVEDOR) throw new UnauthorizedAccessException('Só as conversas dos desenvolvedores podem ser lidas');
    return { id: dono.id, nomeCompleto: dono.nomeCompleto };
  }
}
