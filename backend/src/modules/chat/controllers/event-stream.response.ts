import type { Response } from 'express';
import { ChatEventoDto } from '@project20/shared';

/**
 * Fluxo `text/event-stream` sobre uma resposta HTTP: um evento por `data:`. Os cabeçalhos só saem no **primeiro** evento, então uma
 * falha antes dele (IA desligada, mensagem em andamento) ainda responde com o status HTTP de erro de sempre. Escrever depois de o
 * cliente fechar a conexão é ignorado: a geração continua e a mensagem é gravada mesmo assim.
 */
export class EventStreamResponse {
  private iniciado = false;

  constructor(private readonly resposta: Response) {}

  enviar(evento: ChatEventoDto): void {
    if (!this.iniciado) {
      this.resposta.status(200);
      this.resposta.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      // Sem buffer nem cache no caminho (proxy do dev, nginx): o texto precisa chegar aos poucos.
      this.resposta.setHeader('Cache-Control', 'no-cache, no-transform');
      this.resposta.setHeader('Connection', 'keep-alive');
      this.resposta.setHeader('X-Accel-Buffering', 'no');
      this.resposta.flushHeaders();
      this.iniciado = true;
    }
    if (this.resposta.writableEnded || this.resposta.destroyed) return;
    this.resposta.write(`data: ${JSON.stringify(evento)}\n\n`);
  }

  /** Fecha o fluxo se ele chegou a começar; se não, quem chamou deixa a exceção seguir para o filtro de erros. */
  encerrar(): void {
    if (this.iniciado && !this.resposta.writableEnded) this.resposta.end();
  }
}
