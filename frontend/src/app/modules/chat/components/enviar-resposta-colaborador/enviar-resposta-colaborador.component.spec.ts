import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { EnviarRespostaColaboradorComponent, montarEnvioDaRespostaIa } from './enviar-resposta-colaborador.component';

// "Enviar para colaborador" (task 329): escolher pessoa ou grupo, nota opcional, o corpo do pedido (destino exclusivo, sem o texto da resposta),
// os estados de erro e o fechamento ao enviar.

type Montado = ComponenteMontado<EnviarRespostaColaboradorComponent>;

const RESPOSTA = { id: 'chat-ia-1', conversaId: '4-2026-11-13' };
const PESSOAS = {
    pessoas: [
        { usuarioId: 9, usuarioNome: 'Bruno Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, online: false },
        { usuarioId: 11, usuarioNome: 'Carla Souza', tipo: TipoUsuarioEnum.GESTOR, corAvatar: null, online: true },
    ],
};

async function abrir(): Promise<Montado> {
    const montado = await montarComponente(EnviarRespostaColaboradorComponent, { entradas: { mensagem: RESPOSTA, visivel: true } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/mensagem-direta/pessoas'), PESSOAS);
    await montado.atualizar();
    return montado;
}

const documento = (montado: Montado) => montado.elemento.ownerDocument;
const linhas = (montado: Montado) => Array.from(documento(montado).querySelectorAll<HTMLButtonElement>('.enviar-resposta__linha'));
const botao = (montado: Montado, rotulo: string) =>
    Array.from(documento(montado).querySelectorAll<HTMLButtonElement>('.p-dialog button')).find((item) => item.textContent?.trim() === rotulo)!;

describe('montarEnvioDaRespostaIa', () => {
    let contador = 0;
    const gerarId = () => `id-${++contador}`;

    it('pessoa: só destinatarioId, sem nota nem texto da resposta', () => {
        expect(montarEnvioDaRespostaIa(RESPOSTA, { tipo: 'PESSOA', id: 9, nome: 'Bruno' }, '   ', gerarId)).toEqual({
            conversaId: '4-2026-11-13',
            chatMensagemId: 'chat-ia-1',
            destinatarioId: 9,
            mensagemId: 'id-1',
        });
    });

    it('grupo com nota: só grupoId, nota aparada e um identificador próprio para ela', () => {
        expect(montarEnvioDaRespostaIa(RESPOSTA, { tipo: 'GRUPO', id: 7, nome: 'Time' }, '  olha isso ', gerarId)).toEqual({
            conversaId: '4-2026-11-13',
            chatMensagemId: 'chat-ia-1',
            grupoId: 7,
            mensagemId: 'id-2',
            nota: 'olha isso',
            notaMensagemId: 'id-3',
        });
    });
});

describe('EnviarRespostaColaboradorComponent', () => {
    it('lista as pessoas e o botão Enviar só habilita depois de escolher o destino', async () => {
        const montado = await abrir();
        expect(linhas(montado).map((linha) => linha.querySelector('.enviar-resposta__nome')?.textContent?.trim())).toEqual(['Bruno Lima', 'Carla Souza']);
        expect(botao(montado, 'Enviar').disabled).toBe(true);

        linhas(montado)[0].click();
        await montado.atualizar();
        expect(botao(montado, 'Enviar').disabled).toBe(false);
        expect(linhas(montado)[0].getAttribute('aria-selected')).toBe('true');
    });

    it('envia para a pessoa escolhida com a nota e fecha ao concluir', async () => {
        const montado = await abrir();
        linhas(montado)[1].click();
        montado.componente['controleNota'].setValue('Dá uma olhada');
        await montado.atualizar();

        botao(montado, 'Enviar').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/mensagem-direta/resposta-ia');
        expect(requisicao.request.body).toMatchObject({ conversaId: '4-2026-11-13', chatMensagemId: 'chat-ia-1', destinatarioId: 11, nota: 'Dá uma olhada' });
        expect(requisicao.request.body.texto).toBeUndefined();
        responderSucesso(requisicao, { mensagem: {}, jaExistia: false });
        await montado.atualizar();

        expect(montado.componente.visivel()).toBe(false);
    });

    it('mostra a recusa do servidor e continua aberto para tentar de novo', async () => {
        const montado = await abrir();
        linhas(montado)[0].click();
        await montado.atualizar();

        botao(montado, 'Enviar').click();
        responderErro(esperarRequisicao(montado.http, 'POST', '/mensagem-direta/resposta-ia'), 400, 'Não é possível enviar mensagem para um usuário inativo');
        await montado.atualizar();

        expect(montado.componente.visivel()).toBe(true);
        expect(documento(montado).querySelector('.enviar-resposta__erro')?.textContent).toContain('inativo');
        expect(botao(montado, 'Enviar').disabled).toBe(false);
    });

    it('a busca filtra pelo nome', async () => {
        const montado = await abrir();
        montado.componente['controleBusca'].setValue('carla');
        await montado.atualizar();
        expect(linhas(montado).length).toBe(1);
    });
});
