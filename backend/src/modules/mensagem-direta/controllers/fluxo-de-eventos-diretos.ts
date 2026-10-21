import type { Response } from 'express';
import { MensagemDiretaEventoDto } from '@project20/shared';
import { ConexaoDeEventosDiretos } from '../domain/conexoes-de-eventos-diretos';

/**
 * O stream `text/event-stream` de um cliente do chat entre colaboradores (task 209): um evento por `data:`. Os cabeçalhos saem na
 * criação, porque a conexão é longa e o cliente precisa vê-los antes do primeiro evento. Sem buffer nem cache no caminho (proxy do
 * desenvolvimento, nginx) e sem limite de tempo da resposta.
 */
export class FluxoDeEventosDiretos implements ConexaoDeEventosDiretos {
  constructor(private readonly resposta: Response) {
    resposta.status(200);
    resposta.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    resposta.setHeader('Cache-Control', 'no-cache, no-transform');
    resposta.setHeader('Connection', 'keep-alive');
    resposta.setHeader('X-Accel-Buffering', 'no');
    resposta.flushHeaders();
  }

  enviar(evento: MensagemDiretaEventoDto): void {
    if (this.resposta.writableEnded || this.resposta.destroyed) return;
    this.resposta.write(`data: ${JSON.stringify(evento)}\n\n`);
  }

  encerrar(): void {
    if (!this.resposta.writableEnded) this.resposta.end();
  }
}
