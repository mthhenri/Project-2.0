import { Injectable } from '@nestjs/common';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { DesktopVersaoRecuperadaDto, StandardResponse } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { escolherExecutavelMaisNovo } from '../domain/executavel-do-desktop';

/** O arquivo a entregar: o caminho nunca vem do cliente, só da pasta configurada e de um nome já validado. */
export interface ExecutavelParaBaixar {
  caminho: string;
  nomeArquivo: string;
  tamanhoBytes: number;
}

/** O Project Desktop publicado numa pasta do servidor (task 198): só lê o que está lá, não grava nada. */
@Injectable()
export class DesktopService {
  constructor(private readonly configService: ConfigService) {}

  async recuperarVersao(): Promise<StandardResponse<DesktopVersaoRecuperadaDto>> {
    const executavel = await this.localizarExecutavel();
    const dados: DesktopVersaoRecuperadaDto = executavel
      ? { disponivel: true, versao: executavel.versao, nomeArquivo: executavel.nomeArquivo, tamanhoBytes: executavel.tamanhoBytes }
      : { disponivel: false, versao: null, nomeArquivo: null, tamanhoBytes: null };
    return { sucesso: true, dados, mensagem: 'Versão do Project Desktop consultada com sucesso' };
  }

  /** O arquivo da maior versão publicada; sem pasta configurada ou sem executável, 404. */
  async prepararDownload(): Promise<ExecutavelParaBaixar> {
    const executavel = await this.localizarExecutavel();
    if (!executavel) throw new ResourceNotFoundException('Executável do Project Desktop');
    return { caminho: executavel.caminho, nomeArquivo: executavel.nomeArquivo, tamanhoBytes: executavel.tamanhoBytes };
  }

  private async localizarExecutavel(): Promise<(ExecutavelParaBaixar & { versao: string }) | null> {
    const pasta = this.configService.obter().desktop.pastaExecutaveis;
    if (!pasta) return null;
    let nomes: string[];
    try {
      nomes = await readdir(pasta);
    } catch {
      return null;
    }
    const escolhido = escolherExecutavelMaisNovo(nomes);
    if (!escolhido) return null;
    const caminho = join(pasta, escolhido.nomeArquivo);
    try {
      const arquivo = await stat(caminho);
      if (!arquivo.isFile()) return null;
      return { caminho, nomeArquivo: escolhido.nomeArquivo, tamanhoBytes: arquivo.size, versao: escolhido.versao };
    } catch {
      return null;
    }
  }
}
