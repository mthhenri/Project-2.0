import { describe, it, expect } from 'vitest';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { UsuarioAnotacoesPage } from './usuario-anotacoes.page';

// Deep-link /usuario/:id/anotacoes (task 114): a página só redireciona para onde o drawer vive. O usuário de teste tem id 1.

async function abrir(tipo: TipoUsuarioEnum, idDaRota: string) {
  const rota = { snapshot: { paramMap: convertToParamMap({ id: idDaRota }) } };
  const navegacoes: unknown[][] = [];
  await montarComponente(UsuarioAnotacoesPage, {
    usuario: tipo,
    provedores: [
      { provide: ActivatedRoute, useValue: rota },
      { provide: Router, useValue: { navigate: (...argumentos: unknown[]) => { navegacoes.push(argumentos); return Promise.resolve(true); } } },
    ],
  });
  return navegacoes;
}

describe('UsuarioAnotacoesPage — redirecionamento do deep-link', () => {
  it('gestor vai para a listagem com o drawer do usuário pedido (inclusive o de outro)', async () => {
    expect(await abrir(TipoUsuarioEnum.GESTOR, '9')).toEqual([[['/usuario'], { queryParams: { anotacoes: 9 }, replaceUrl: true }]]);
  });

  it('administrador também é tratado como gestor', async () => {
    expect(await abrir(TipoUsuarioEnum.ADMINISTRADOR, '9')).toEqual([[['/usuario'], { queryParams: { anotacoes: 9 }, replaceUrl: true }]]);
  });

  it('desenvolvedor abre o próprio pad pelo Ponto', async () => {
    expect(await abrir(TipoUsuarioEnum.DESENVOLVEDOR, '1')).toEqual([[['/ponto'], { queryParams: { anotacoes: 1 }, replaceUrl: true }]]);
  });

  it('desenvolvedor com id alheio vai ao Ponto sem drawer', async () => {
    expect(await abrir(TipoUsuarioEnum.DESENVOLVEDOR, '9')).toEqual([[['/ponto'], { replaceUrl: true }]]);
  });
});
