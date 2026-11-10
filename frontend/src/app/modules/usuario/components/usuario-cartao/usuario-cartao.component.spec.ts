import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UsuarioCartaoComponent } from './usuario-cartao.component';

describe('UsuarioCartaoComponent', () => {
    it('mostra as iniciais (primeira e última palavra), o nome e o login', () => {
        const fixture = TestBed.createComponent(UsuarioCartaoComponent);
        fixture.componentRef.setInput('usuario', { nomeCompleto: 'maria clara souza', login: 'maria.souza' });
        fixture.detectChanges();
        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).toContain('MS');
        expect(texto).toContain('maria clara souza');
        expect(texto).toContain('maria.souza');
    });

    it('acompanha a troca do usuário recebido', () => {
        const fixture = TestBed.createComponent(UsuarioCartaoComponent);
        fixture.componentRef.setInput('usuario', { nomeCompleto: 'Ana Lima', login: 'ana' });
        fixture.detectChanges();
        fixture.componentRef.setInput('usuario', { nomeCompleto: 'Bruno Reis', login: 'bruno' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.avatar-usuario').textContent.trim()).toBe('BR');
    });
});
