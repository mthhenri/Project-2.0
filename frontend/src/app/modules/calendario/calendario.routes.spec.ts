import { describe, it, expect } from 'vitest';
import { gestorGuard } from '../../core/guards/gestor.guard';
import { calendarioRotas } from './calendario.routes';

// O Calendário é tela de gestor: o desenvolvedor e o auxiliar veem os feriados pelo Ponto, nunca pela rota (o item sai da barra e a URL é barrada).
describe('calendarioRotas', () => {
    it('a rota raiz exige o gestorGuard', () => {
        expect(calendarioRotas[0].canActivate).toEqual([gestorGuard]);
    });
});
