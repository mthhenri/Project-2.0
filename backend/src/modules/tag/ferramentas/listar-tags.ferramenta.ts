import { Injectable } from '@nestjs/common';
import { TagsListadasDto, TagsListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { TagService } from '../services/tag.service';

/** Quantas tags voltam de uma vez à IA. */
export const LIMITE_TAGS_DA_FERRAMENTA = 100;

/** As tags ativas, pela `TagService` (leitura aberta a qualquer usuário, como na tela). */
@Injectable()
export class ListarTagsFerramenta extends FerramentaIa<TagsListarDto> {
  readonly nome = 'listar_tags';
  readonly descricao = 'Lista as tags existentes, com id, nome e cor. Use para responder quais tags há e para conferir se uma tag existe antes de falar dela.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = TagsListarDto;

  constructor(private readonly tagService: TagService) {
    super();
  }

  async executar(_entrada: TagsListarDto, _usuarioAtivo: JwtPayload): Promise<TagsListadasDto> {
    const tags = (await this.tagService.listar()).dados ?? [];
    return {
      tags: tags.slice(0, LIMITE_TAGS_DA_FERRAMENTA).map((tag) => ({ id: tag.id, nome: tag.nome, cor: tag.cor })),
      total: tags.length,
      haMais: tags.length > LIMITE_TAGS_DA_FERRAMENTA,
    };
  }
}
