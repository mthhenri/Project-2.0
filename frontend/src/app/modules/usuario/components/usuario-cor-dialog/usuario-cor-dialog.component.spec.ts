import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { UsuarioCorDialogComponent } from './usuario-cor-dialog.component';

async function montar() {
    const montado = await montarComponente(UsuarioCorDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    return montado;
}

const fundos = () => Array.from(document.body.querySelectorAll<HTMLElement>('.avatar-usuario')).map((avatar) => avatar.style.background);

describe('UsuarioCorDialogComponent', () => {
    it('abre com a cor atual da pessoa e mostra as prévias dos lugares do chat e do resto do sistema', async () => {
        const montado = await montar();
        montado.componente.sessao.definirCorAvatar('#1E3A8A');
        montado.componente.abrir();
        await montado.atualizar();
        expect(montado.componente.cor()).toBe('#1E3A8A');
        const texto = document.body.textContent ?? '';
        const lugares = [
            'Lista de conversas', 'Cabeçalho da conversa', 'Barra de conversas', 'Aviso de mensagem nova',
            'Barra de cima', 'Atividades e execuções', 'Membros da demanda', 'Ponto da equipe', 'Em andamento agora', 'Tela de entrada',
        ];
        for (const lugar of lugares) expect(texto).toContain(lugar);
        // a bolinha do seletor e as dez prévias da pessoa usam a cor em escolha; as outras da barra e da pilha de membros ficam no padrão
        expect(fundos().filter((fundo) => fundo === 'rgb(30, 58, 138)').length).toBe(11);
    });

    it('escolher outra cor muda as prévias na hora, sem gravar', async () => {
        const montado = await montar();
        montado.componente.abrir();
        montado.componente.cor.set('#FDE047');
        await montado.atualizar();
        expect(fundos().filter((fundo) => fundo === 'rgb(253, 224, 71)').length).toBe(11);
        montado.http.expectNone((requisicao) => requisicao.url.includes('/usuario/cor'));
    });

    it('Salvar grava a cor, guarda na sessão, avisa e fecha', async () => {
        const montado = await montar();
        montado.componente.abrir();
        montado.componente.cor.set('#0EA5E9');
        montado.componente.salvar();
        const requisicao = esperarRequisicao(montado.http, 'PUT', '/usuario/cor');
        expect(requisicao.request.body).toEqual({ corAvatar: '#0EA5E9' });
        responderSucesso(requisicao, { corAvatar: '#0EA5E9' });
        await montado.atualizar();
        expect(montado.componente.sessao.corAvatar()).toBe('#0EA5E9');
        expect(montado.componente.mostrarDialog()).toBe(false);
        expect(montado.componente.carregando()).toBe(false);
    });

    it('voltar à cor padrão e salvar envia null', async () => {
        const montado = await montar();
        montado.componente.sessao.definirCorAvatar('#0EA5E9');
        montado.componente.abrir();
        montado.componente.cor.set(null);
        montado.componente.salvar();
        const requisicao = esperarRequisicao(montado.http, 'PUT', '/usuario/cor');
        expect(requisicao.request.body).toEqual({ corAvatar: null });
        responderSucesso(requisicao, { corAvatar: null });
        await montado.atualizar();
        expect(montado.componente.sessao.corAvatar()).toBeNull();
    });

    it('Cancelar fecha sem gravar e sem mexer na sessão', async () => {
        const montado = await montar();
        montado.componente.sessao.definirCorAvatar('#0EA5E9');
        montado.componente.abrir();
        montado.componente.cor.set('#EF4444');
        montado.componente.mostrarDialog.set(false);
        await montado.atualizar();
        expect(montado.componente.sessao.corAvatar()).toBe('#0EA5E9');
        montado.http.expectNone((requisicao) => requisicao.url.includes('/usuario/cor'));
    });
});
