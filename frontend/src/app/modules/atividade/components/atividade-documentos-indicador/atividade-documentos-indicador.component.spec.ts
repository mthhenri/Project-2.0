import { describe, it, expect } from 'vitest';
import { AtividadeResumoDto } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeDocumentosIndicadorComponent, CampoDocumentoDaDemanda } from './atividade-documentos-indicador.component';

// Três ícones de texto da demanda (cliente, técnica, documentação): acesos quando a demanda tem o texto; o clique pede para abri-lo.

function atividade(tem: { cliente: boolean; tecnica: boolean; documentacao: boolean }): AtividadeResumoDto {
  return { demandaTemDescricaoCliente: tem.cliente, demandaTemDescricaoTecnica: tem.tecnica, demandaTemDocumentacao: tem.documentacao } as AtividadeResumoDto;
}

async function montar(tem: { cliente: boolean; tecnica: boolean; documentacao: boolean }) {
  const montado = await montarComponente(AtividadeDocumentosIndicadorComponent, { entradas: { atividade: atividade(tem) } });
  const abertos: CampoDocumentoDaDemanda[] = [];
  montado.componente.abrir.subscribe((campo) => abertos.push(campo));
  const icones = () => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.atividade-documentos__icone'));
  return { montado, abertos, icones };
}

describe('AtividadeDocumentosIndicadorComponent', () => {
  it('mostra um ícone por tipo, na ordem cliente, técnica e documentação', async () => {
    const { icones } = await montar({ cliente: false, tecnica: false, documentacao: false });
    expect(icones().map((icone) => icone.getAttribute('aria-label'))).toEqual(['Descrição do cliente', 'Descrição técnica', 'Documentação']);
  });

  it('acende só os ícones dos textos que a demanda tem', async () => {
    const { icones } = await montar({ cliente: true, tecnica: false, documentacao: true });
    expect(icones().map((icone) => icone.classList.contains('atividade-documentos__icone--ativo'))).toEqual([true, false, true]);
  });

  it('demanda sem nenhum texto deixa os três apagados', async () => {
    const { icones } = await montar({ cliente: false, tecnica: false, documentacao: false });
    expect(icones().some((icone) => icone.classList.contains('atividade-documentos__icone--ativo'))).toBe(false);
  });

  it('o clique emite o campo correspondente, também quando o ícone está apagado', async () => {
    const { icones, abertos } = await montar({ cliente: false, tecnica: true, documentacao: false });
    icones().forEach((icone) => icone.click());
    expect(abertos).toEqual(['descricaoCliente', 'descricaoTecnica', 'documentacao']);
  });

  it('temConteudo mapeia cada campo para a flag da demanda', async () => {
    const { montado } = await montar({ cliente: true, tecnica: false, documentacao: false });
    expect(montado.componente.temConteudo('descricaoCliente')).toBe(true);
    expect(montado.componente.temConteudo('descricaoTecnica')).toBe(false);
    expect(montado.componente.temConteudo('documentacao')).toBe(false);
  });
});
