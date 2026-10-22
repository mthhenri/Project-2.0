import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MensagemDiretaReferenciaRecuperadaDto, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { MensagemDiretaService } from './mensagem-direta.service';

/**
 * O cartão de cada referência (task 211), resolvido **para quem está olhando** e guardado por sessão: a mesma demanda citada em dez mensagens
 * é uma consulta só. Falha de rede não fica guardada (o cartão tenta de novo); `null` é essa falha, e `acessivel: false` é a resposta do servidor.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaReferenciaService {
  private readonly api = inject(MensagemDiretaService);
  private cache = new Map<string, Promise<MensagemDiretaReferenciaRecuperadaDto | null>>();

  recuperar(tipo: ReferenciaMensagemDiretaEnum, id: number): Promise<MensagemDiretaReferenciaRecuperadaDto | null> {
    const chave = `${tipo}:${id}`;
    const guardada = this.cache.get(chave);
    if (guardada) return guardada;
    const consulta = firstValueFrom(this.api.recuperarReferencia(tipo, id))
      .then((resposta) => resposta.dados ?? null)
      .catch(() => {
        this.cache.delete(chave);
        return null;
      });
    this.cache.set(chave, consulta);
    return consulta;
  }

  /** Esquece tudo (a sessão trocou: o acesso do próximo usuário é outro). */
  limpar(): void {
    this.cache = new Map();
  }
}
