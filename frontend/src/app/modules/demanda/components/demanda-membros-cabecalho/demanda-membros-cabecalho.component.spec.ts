import { describe, expect, it } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DemandaMembrosCabecalhoComponent } from './demanda-membros-cabecalho.component';

// Task 307: "Participar" e "Sair" aparecem para quem pode ser membro (desenvolvedor e auxiliar, este junto da busca e do ×);
// gestor e administrador não são membros por regra e não veem nenhum dos dois.

async function montar(usuario: TipoUsuarioEnum) {
    return montarComponente(DemandaMembrosCabecalhoComponent, { usuario, entradas: { demandaId: 1 } });
}

function textoDosBotoes(elemento: HTMLElement): string {
    return Array.from(elemento.querySelectorAll('button'))
        .map((botao) => botao.textContent?.trim())
        .join('|');
}

describe('DemandaMembrosCabecalhoComponent', () => {
    it('desenvolvedor vê "Participar" quando não é membro, sem a busca', async () => {
        const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
        expect(textoDosBotoes(montado.elemento)).toContain('Participar');
        expect(montado.elemento.querySelector('[aria-label="Adicionar membro"]')).toBeNull();
    });

    it('auxiliar vê "Participar" junto do botão de adicionar membro', async () => {
        const montado = await montar(TipoUsuarioEnum.AUXILIAR);
        expect(textoDosBotoes(montado.elemento)).toContain('Participar');
        expect(montado.elemento.querySelector('[aria-label="Adicionar membro"]')).not.toBeNull();
    });

    it('auxiliar que já é membro vê "Sair"', async () => {
        const montado = await montar(TipoUsuarioEnum.AUXILIAR);
        const sessao = montado.componente.sessao;
        montado.fixture.componentRef.setInput('membros', [{ usuarioId: sessao.id(), nomeCompleto: 'Aux Teste', cargoTitulo: 'Analista' }]);
        await montado.atualizar();
        expect(textoDosBotoes(montado.elemento)).toContain('Sair');
        expect(textoDosBotoes(montado.elemento)).not.toContain('Participar');
    });

    for (const [rotulo, tipo] of [['gestor', TipoUsuarioEnum.GESTOR], ['administrador', TipoUsuarioEnum.ADMINISTRADOR]] as const) {
        it(`${rotulo} não vê "Participar" nem "Sair", só a busca de membros`, async () => {
            const montado = await montar(tipo);
            expect(textoDosBotoes(montado.elemento)).not.toMatch(/Participar|Sair/);
            expect(montado.elemento.querySelector('[aria-label="Adicionar membro"]')).not.toBeNull();
        });
    }
});
