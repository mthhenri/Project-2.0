import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TipoProjetoStatusEnum } from '@project20/shared';
import { ProjetoStatusChipComponent } from './projeto-status-chip.component';

function montar(status: TipoProjetoStatusEnum, editavel: boolean) {
  TestBed.configureTestingModule({ providers: [providePrimeNG({ theme: 'none' }), provideNoopAnimations()] });
  const fixture = TestBed.createComponent(ProjetoStatusChipComponent);
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('editavel', editavel);
  fixture.detectChanges();
  const escolhidos: TipoProjetoStatusEnum[] = [];
  fixture.componentInstance.statusEscolhido.subscribe((valor) => escolhidos.push(valor));
  return { fixture, componente: fixture.componentInstance, elemento: fixture.nativeElement as HTMLElement, escolhidos };
}

describe('ProjetoStatusChipComponent', () => {
  it('mostra o rótulo de cada status', () => {
    const esperado: Record<TipoProjetoStatusEnum, string> = {
      ATIVO: 'Ativo', PAUSADO: 'Pausado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
    };
    expect(Object.keys(esperado).sort()).toEqual(Object.values(TipoProjetoStatusEnum).sort());
    expect(montar(TipoProjetoStatusEnum.CONCLUIDO, false).elemento.textContent).toContain(esperado.CONCLUIDO);
  });

  it('cada status tem uma severidade própria e o cancelado é perigo', () => {
    const { componente } = montar(TipoProjetoStatusEnum.ATIVO, false);
    expect(componente.severidade(TipoProjetoStatusEnum.ATIVO)).toBe('success');
    expect(componente.severidade(TipoProjetoStatusEnum.PAUSADO)).toBe('warn');
    expect(componente.severidade(TipoProjetoStatusEnum.CONCLUIDO)).toBe('info');
    expect(componente.severidade(TipoProjetoStatusEnum.CANCELADO)).toBe('danger');
  });

  it('somente leitura não tem botão de troca', () => {
    const { elemento } = montar(TipoProjetoStatusEnum.ATIVO, false);
    expect(elemento.querySelector('[aria-label="Trocar status do projeto"]')).toBeNull();
  });

  it('editável mostra o botão de troca com os quatro status como opções', () => {
    const { elemento, componente } = montar(TipoProjetoStatusEnum.ATIVO, true);
    expect(elemento.querySelector('[aria-label="Trocar status do projeto"]')).not.toBeNull();
    expect(componente.opcoes.map((opcao) => opcao.label)).toEqual(['Ativo', 'Pausado', 'Concluído', 'Cancelado']);
  });

  it('escolher outro status emite e escolher o mesmo não emite', () => {
    const { componente, escolhidos } = montar(TipoProjetoStatusEnum.ATIVO, true);
    const popover = { hide: () => undefined } as never;
    componente.escolher(TipoProjetoStatusEnum.ATIVO, popover);
    componente.escolher(TipoProjetoStatusEnum.PAUSADO, popover);
    expect(escolhidos).toEqual([TipoProjetoStatusEnum.PAUSADO]);
  });
});
