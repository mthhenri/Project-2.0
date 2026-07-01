import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { RelatorioService } from '../services/relatorio.service';
import {
  RelatorioExecucaoConsultarDto,
  RelatorioExecucaoBaixarDto,
  RelatorioRevisaoSolicitarDto,
} from '@project20/shared';

@Controller('relatorio')
@UseGuards(JwtAuthGuard)
export class RelatorioController {
  constructor(private readonly relatorioService: RelatorioService) {}

  @GestorOnly()
  @Get('execucao')
  gerar(
    @Query() dto: RelatorioExecucaoConsultarDto,
    @Query('projetoId', ParseIntPipe) projetoId: number,
  ) {
    return this.relatorioService.gerarRelatorio({ ...dto, projetoId });
  }

  @GestorOnly()
  @Get('execucao/download')
  async baixar(
    @Query() dto: RelatorioExecucaoBaixarDto,
    @Query('projetoId', ParseIntPipe) projetoId: number,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<StreamableFile> {
    const arquivo = await this.relatorioService.baixarRelatorio({ ...dto, projetoId });
    resposta.setHeader('Content-Type', arquivo.mimeType);
    resposta.setHeader('Content-Disposition', `attachment; filename="${arquivo.nomeArquivo}"`);
    return new StreamableFile(arquivo.conteudo);
  }

  @GestorOnly()
  @Post('execucao/revisar')
  revisar(
    @Body() dto: RelatorioRevisaoSolicitarDto,
    @Query('projetoId', ParseIntPipe) projetoId: number,
  ) {
    return this.relatorioService.revisarRelatorio({ ...dto, projetoId });
  }
}
