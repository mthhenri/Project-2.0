import { Injectable } from '@nestjs/common';
import { TagRepository } from '../repositories/tag.repository';
import {
  TagCriarDto,
  TagCriadaDto,
  TagResumoDto,
  TagRecuperadaDto,
  TagInternoAlterarDto,
  TagAlteradaDto,
  TagRecuperarDto,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

@Injectable()
export class TagService {
  constructor(private readonly tagRepositorio: TagRepository) {}

  /** Cria nova tag validando unicidade do nome. Restrito a gestores. */
  async criar(dto: TagCriarDto): Promise<StandardResponse<TagCriadaDto>> {
    const nomeJaExiste = await this.tagRepositorio.validarNome({ nome: dto.nome });

    if (nomeJaExiste) {
      throw new BusinessException('Já existe uma tag com esse nome');
    }

    const tagCriada = await this.tagRepositorio.inserir({ nome: dto.nome, cor: dto.cor });

    return {
      sucesso:  true,
      dados:    tagCriada,
      mensagem: 'Tag criada com sucesso',
    };
  }

  /** Lista todas as tags ativas. Disponível para todos os usuários autenticados. */
  async listar(): Promise<StandardResponse<TagResumoDto[]>> {
    const tags = await this.tagRepositorio.listar();

    return {
      sucesso:  true,
      dados:    tags,
      mensagem: 'Tags listadas com sucesso',
    };
  }

  /** Recupera tag por ID. Lança exceção se não encontrada. */
  async recuperar(dto: TagRecuperarDto): Promise<StandardResponse<TagRecuperadaDto>> {
    const tagEncontrada = await this.tagRepositorio.recuperar({ id: dto.id });

    if (!tagEncontrada) {
      throw new ResourceNotFoundException('Tag');
    }

    return {
      sucesso:  true,
      dados:    tagEncontrada,
      mensagem: 'Tag recuperada com sucesso',
    };
  }

  /** Altera nome e/ou cor da tag. Restrito a gestores. */
  async alterar(dto: TagInternoAlterarDto): Promise<StandardResponse<TagAlteradaDto>> {
    const tagEncontrada = await this.tagRepositorio.recuperar({ id: dto.id });

    if (!tagEncontrada) {
      throw new ResourceNotFoundException('Tag');
    }

    if (dto.nome !== undefined) {
      const nomeJaExiste = await this.tagRepositorio.validarNome({ nome: dto.nome, idExcluir: dto.id });
      if (nomeJaExiste) {
        throw new BusinessException('Já existe uma tag com esse nome');
      }
    }

    const tagAlterada = await this.tagRepositorio.alterar({ id: dto.id, nome: dto.nome, cor: dto.cor });

    return {
      sucesso:  true,
      dados:    tagAlterada,
      mensagem: 'Tag alterada com sucesso',
    };
  }

  /** Realiza soft delete da tag. Restrito a gestores. */
  async excluir(dto: TagRecuperarDto): Promise<StandardResponse<void>> {
    const tagEncontrada = await this.tagRepositorio.recuperar({ id: dto.id });

    if (!tagEncontrada) {
      throw new ResourceNotFoundException('Tag');
    }

    await this.tagRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Tag excluída com sucesso',
    };
  }
}
