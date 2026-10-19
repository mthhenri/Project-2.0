import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { Response } from 'express';
import { DesktopService } from '../services/desktop.service';

/** O Project Desktop para baixar (task 198): qualquer usuário autenticado. */
@Controller('desktop')
export class DesktopController {
  constructor(private readonly desktopService: DesktopService) {}

  @Get('versao')
  recuperarVersao() {
    return this.desktopService.recuperarVersao();
  }

  @Get('download')
  async baixar(@Res({ passthrough: true }) resposta: Response): Promise<StreamableFile> {
    const executavel = await this.desktopService.prepararDownload();
    resposta.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    resposta.setHeader('Content-Disposition', `attachment; filename="${executavel.nomeArquivo}"`);
    resposta.setHeader('Content-Length', String(executavel.tamanhoBytes));
    return new StreamableFile(createReadStream(executavel.caminho));
  }
}
