import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TipoUsuarioEnum } from '@project20/shared';
import { rotuloTipoUsuario, severidadeTipoUsuario } from './tipo-usuario';
import { urlRetornoSegura } from './url-retorno';

describe('tipo-usuario', () => {
    it('rótulos por tipo, com a forma curta do desenvolvedor', () => {
        expect(rotuloTipoUsuario(TipoUsuarioEnum.ADMINISTRADOR)).toBe('Administrador');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.GESTOR)).toBe('Gestor');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.DESENVOLVEDOR)).toBe('Desenvolvedor');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.AUXILIAR)).toBe('Auxiliar');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.AUXILIAR, true)).toBe('Aux');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.DESENVOLVEDOR, true)).toBe('Dev');
        expect(rotuloTipoUsuario(TipoUsuarioEnum.GESTOR, true)).toBe('Gestor');
    });

    it('o administrador se destaca do gestor na cor da tag', () => {
        expect(severidadeTipoUsuario(TipoUsuarioEnum.ADMINISTRADOR)).toBe('contrast');
        expect(severidadeTipoUsuario(TipoUsuarioEnum.GESTOR)).toBe('warn');
        expect(severidadeTipoUsuario(TipoUsuarioEnum.DESENVOLVEDOR)).toBe('info');
        expect(severidadeTipoUsuario(TipoUsuarioEnum.AUXILIAR)).toBe('success');
    });
});

describe('urlRetornoSegura', () => {
    const roteador = () => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        return TestBed.inject(Router);
    };

    it('aceita caminho interno, com query', () => {
        const registroPrincipal = roteador();
        expect(urlRetornoSegura(registroPrincipal, '/demanda/5')).toBe('/demanda/5');
        expect(urlRetornoSegura(registroPrincipal, '/atividade?pagina=2')).toBe('/atividade?pagina=2');
    });

    it('sem retorno, vazio ou nulo cai em /ponto', () => {
        const registroSeguinte = roteador();
        for (const valor of [null, undefined, '']) expect(urlRetornoSegura(registroSeguinte, valor)).toBe('/ponto');
    });

    it('recusa destino externo, protocolo relativo e barra invertida (open redirect)', () => {
        const registroAtual = roteador();
        for (const valor of ['https://mal.com', '//mal.com', 'javascript:alert(1)', '/\\mal.com', 'ponto']) {
            expect(urlRetornoSegura(registroAtual, valor), valor).toBe('/ponto');
        }
    });

    it('nunca volta para o próprio login nem para a raiz', () => {
        const registro = roteador();
        for (const valor of ['/autenticacao', '/autenticacao?x=1', '/']) expect(urlRetornoSegura(registro, valor), valor).toBe('/ponto');
    });
});
