import { Injectable } from '@nestjs/common';
import { ProjetoVolumeVigenciaCriarDto, ProjetoVolumeVigenciaResumoDto, ProjetoVolumeVigenciaListarDto, ProjetoVolumeVigenciaExcluirDto } from '@project20/shared';
import { ProjetoVolumeVigenciaRepository } from '../repositories/projeto-volume-vigencia.repository';
import { ProjetoRepository } from '../repositories/projeto.repository';
import { normalizarVolumeVigencia } from '../domain/volume-vigencia';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

@Injectable()
export class ProjetoVolumeVigenciaService {
  constructor(private readonly repositorio: ProjetoVolumeVigenciaRepository, private readonly projetoRepositorio: ProjetoRepository) {}

  /** Lista vigências de um projeto existente; acesso restrito pelo controller. */
  async listar(dto: ProjetoVolumeVigenciaListarDto): Promise<ProjetoVolumeVigenciaResumoDto[]> {
    if (!await this.projetoRepositorio.recuperar({ id: dto.projetoId })) throw new ResourceNotFoundException('Projeto');
    return this.repositorio.listar(dto);
  }

  /** Normaliza a data e substitui a vigência do mesmo mês, preservando a anterior por soft delete. */
  async criar(dto: ProjetoVolumeVigenciaCriarDto): Promise<ProjetoVolumeVigenciaResumoDto> {
    const normalizado = normalizarVolumeVigencia(dto);
    return this.repositorio.emTransacao(dto, async (repositorio, projetoExiste) => {
      if (!projetoExiste) throw new ResourceNotFoundException('Projeto');
      const vigencias = await repositorio.listar(dto);
      const anterior = vigencias.find((vigencia) => vigencia.vigenciaInicioData === normalizado.vigenciaInicioData);
      if (anterior) await repositorio.excluir({ projetoId: dto.projetoId, vigenciaId: anterior.id });
      return repositorio.inserir(normalizado);
    });
  }

  /** Exclui uma vigência somente quando pertence ao projeto informado. */
  async excluir(dto: ProjetoVolumeVigenciaExcluirDto): Promise<void> {
    return this.repositorio.emTransacao(dto, async (repositorio, projetoExiste) => {
      if (!projetoExiste) throw new ResourceNotFoundException('Projeto');
      const vigencias = await repositorio.listar(dto);
      if (!vigencias.some((vigencia) => vigencia.id === dto.vigenciaId)) throw new ResourceNotFoundException('Vigência');
      await repositorio.excluir(dto);
    });
  }
}
