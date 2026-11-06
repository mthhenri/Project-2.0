import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaConfiguracoesBotaoComponent } from './mensagem-direta-configuracoes-botao.component';

// A engrenagem do chat (pedido do autor em 2026-11-06): abre a tela de configurações no popup e avisa quando o chat está silenciado.

describe('MensagemDiretaConfiguracoesBotaoComponent', () => {
    const montar = () => montarComponente(MensagemDiretaConfiguracoesBotaoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    const botao = (tela: Awaited<ReturnType<typeof montar>>) => tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Configurações do chat"]')!;

    it('clicar abre a tela de configurações, e voltar devolve à lista', async () => {
        const tela = await montar();
        const estado = TestBed.inject(MensagemDiretaEstadoService);
        botao(tela).click();
        expect(estado.visao()).toBe('CONFIGURACOES');
        estado.fecharConfiguracoes();
        expect(estado.visao()).toBe('LISTA');
    });

    it('fica em alerta com os avisos desligados ou o chat silenciado', async () => {
        const tela = await montar();
        const avisos = TestBed.inject(MensagemDiretaAvisosService);
        expect(tela.elemento.innerHTML).not.toContain('p-button-warn');
        avisos.preferencia.update((atual) => ({ ...atual, avisosAtivos: false }));
        await tela.atualizar();
        expect(tela.elemento.innerHTML).toContain('p-button-warn');
        avisos.preferencia.update((atual) => ({ ...atual, avisosAtivos: true, silenciadoAteDate: new Date(Date.now() + 3_600_000) }));
        await tela.atualizar();
        expect(tela.elemento.innerHTML).toContain('p-button-warn');
    });
});
