import { describe, expect, it } from 'vitest';
import {
  atalhoDoTeclado,
  AvisoNaTela,
  EntradaDaDecisaoDeAviso,
  MAXIMO_DE_AVISOS_NA_TELA,
  decidirAviso,
  normalizarPreferencia,
  rotuloDaQuantidade,
  rotuloDoSilencio,
  silenciarAte,
  silencioIndeterminado,
  somarAviso,
} from './avisos.util';

const FUSO = 'America/Sao_Paulo';
const AGORA = new Date('2026-10-21T18:00:00.000Z'); // 15:00 em São Paulo (UTC-3)

function entrada(parcial: Partial<EntradaDaDecisaoDeAviso> = {}, preferencia: Partial<EntradaDaDecisaoDeAviso['preferencia']> = {}): EntradaDaDecisaoDeAviso {
  return {
    preferencia: { avisosAtivos: true, avisoDesktopAtivo: true, somAtivo: false, silenciadoAteDate: null, atalhoGlobal: 'Ctrl+Shift+Space', ...preferencia },
    mensagemMinha: false,
    mencionaVoce: false,
    conversaSilenciada: false,
    conversaAVista: false,
    agora: AGORA,
    ...parcial,
  };
}

describe('decidirAviso', () => {
  it('avisa a mensagem de outra pessoa quando nada cala', () => {
    expect(decidirAviso(entrada())).toEqual({ avisar: true, motivo: null });
  });

  it('nunca avisa mensagem minha, nem com os avisos desligados (mesmo com menção)', () => {
    expect(decidirAviso(entrada({ mensagemMinha: true }))).toEqual({ avisar: false, motivo: 'MINHA' });
    expect(decidirAviso(entrada({ mencionaVoce: true }, { avisosAtivos: false }))).toEqual({ avisar: false, motivo: 'AVISOS_DESLIGADOS' });
  });

  it('o silêncio geral cala tudo, até a menção; vencido o prazo, volta a avisar (no próprio instante final)', () => {
    const ate = new Date(AGORA.getTime() + 3_600_000);
    expect(decidirAviso(entrada({ mencionaVoce: true }, { silenciadoAteDate: ate }))).toEqual({ avisar: false, motivo: 'SILENCIO_GERAL' });
    expect(decidirAviso(entrada({ agora: new Date(ate.getTime() - 1) }, { silenciadoAteDate: ate })).avisar).toBe(false);
    expect(decidirAviso(entrada({ agora: ate }, { silenciadoAteDate: ate })).avisar).toBe(true);
  });

  it('a conversa silenciada só avisa quando a mensagem menciona o usuário', () => {
    expect(decidirAviso(entrada({ conversaSilenciada: true }))).toEqual({ avisar: false, motivo: 'CONVERSA_SILENCIADA' });
    expect(decidirAviso(entrada({ conversaSilenciada: true, mencionaVoce: true })).avisar).toBe(true);
  });

  it('não avisa o que o usuário já está olhando', () => {
    expect(decidirAviso(entrada({ conversaAVista: true }))).toEqual({ avisar: false, motivo: 'A_VISTA' });
  });
});

describe('silenciar', () => {
  it('uma hora é uma hora a partir de agora', () => {
    expect(silenciarAte('UMA_HORA', AGORA, FUSO).toISOString()).toBe('2026-10-21T19:00:00.000Z');
  });

  it('amanhã às 8h é no fuso do sistema, não no do navegador', () => {
    // 15:00 de 21/10 em São Paulo: amanhã às 8h de lá é 11:00 UTC de 22/10.
    expect(silenciarAte('AMANHA_8H', AGORA, FUSO).toISOString()).toBe('2026-10-22T11:00:00.000Z');
    // Em Tóquio (UTC+9) são 03:00 de 22/10: "amanhã" é 23/10 às 8h, ou seja, 22/10 23:00 UTC.
    expect(silenciarAte('AMANHA_8H', AGORA, 'Asia/Tokyo').toISOString()).toBe('2026-10-22T23:00:00.000Z');
  });

  it('amanhã às 8h depois da meia-noite (ainda "hoje" de madrugada) continua sendo o dia seguinte do relógio do sistema', () => {
    const madrugada = new Date('2026-10-22T03:30:00.000Z'); // 00:30 de 22/10 em São Paulo
    expect(silenciarAte('AMANHA_8H', madrugada, FUSO).toISOString()).toBe('2026-10-23T11:00:00.000Z');
  });

  it('até reativar é uma data muito distante e conta como indeterminada', () => {
    const ate = silenciarAte('ATE_REATIVAR', AGORA, FUSO);
    expect(ate.getFullYear()).toBeGreaterThanOrEqual(2125);
    expect(silencioIndeterminado(ate, AGORA)).toBe(true);
    expect(silencioIndeterminado(silenciarAte('AMANHA_8H', AGORA, FUSO), AGORA)).toBe(false);
    expect(silencioIndeterminado(null, AGORA)).toBe(false);
  });
});

describe('rotuloDoSilencio', () => {
  it('descreve até quando, no fuso do sistema', () => {
    expect(rotuloDoSilencio(silenciarAte('UMA_HORA', AGORA, FUSO), AGORA, FUSO)).toBe('Silenciado até 16:00');
    expect(rotuloDoSilencio(silenciarAte('AMANHA_8H', AGORA, FUSO), AGORA, FUSO)).toBe('Silenciado até amanhã 08:00');
    expect(rotuloDoSilencio(silenciarAte('ATE_REATIVAR', AGORA, FUSO), AGORA, FUSO)).toBe('Silenciado até você reativar');
    expect(rotuloDoSilencio(new Date('2026-10-25T11:00:00.000Z'), AGORA, FUSO)).toBe('Silenciado até 25/10 08:00');
  });

  it('sem silêncio, ou com o prazo vencido, é vazio', () => {
    expect(rotuloDoSilencio(null, AGORA, FUSO)).toBe('');
    expect(rotuloDoSilencio(new Date(AGORA.getTime() - 1), AGORA, FUSO)).toBe('');
  });
});

describe('normalizarPreferencia', () => {
  it('converte a data do silêncio em Date e mantém o nulo', () => {
    const base = { avisosAtivos: true, avisoDesktopAtivo: true, somAtivo: false, atalhoGlobal: 'Alt+F1' };
    expect(normalizarPreferencia({ ...base, silenciadoAteDate: '2026-10-21T19:00:00.000Z' as never }).silenciadoAteDate).toEqual(new Date('2026-10-21T19:00:00.000Z'));
    expect(normalizarPreferencia({ ...base, silenciadoAteDate: null }).silenciadoAteDate).toBeNull();
  });
});

describe('somarAviso', () => {
  const mensagem = (conversaId: string, texto: string, mencionaVoce = false, agora = 1) => ({ conversaId, usuarioId: Number(conversaId.split('-')[1]), usuarioNome: `Pessoa ${conversaId}`, texto, mencionaVoce, agora });

  it('conversa nova entra no topo', () => {
    const avisos = somarAviso(somarAviso([], mensagem('1-2', 'oi')), mensagem('1-3', 'olá', false, 2));
    expect(avisos.map((a) => a.id)).toEqual(['1-3', '1-2']);
    expect(avisos[0]).toMatchObject({ quantidade: 1, texto: 'olá', atualizadoEm: 2 });
  });

  it('mensagens seguidas da mesma pessoa atualizam o mesmo cartão (quantidade, prévia, menção e tempo) e o levam ao topo', () => {
    let avisos: AvisoNaTela[] = somarAviso([], mensagem('1-2', 'primeira', false, 1));
    avisos = somarAviso(avisos, mensagem('1-3', 'outra pessoa', false, 2));
    avisos = somarAviso(avisos, mensagem('1-2', 'segunda com @você', true, 3));
    avisos = somarAviso(avisos, mensagem('1-2', 'terceira', false, 4));

    expect(avisos.map((a) => a.id)).toEqual(['1-2', '1-3']);
    expect(avisos[0]).toMatchObject({ quantidade: 3, texto: 'terceira', mencionaVoce: true, atualizadoEm: 4 });
  });

  it('no máximo três cartões: o mais antigo sai', () => {
    let avisos: AvisoNaTela[] = [];
    for (let i = 2; i <= 6; i++) avisos = somarAviso(avisos, mensagem(`1-${i}`, `msg ${i}`, false, i));
    expect(avisos.length).toBe(MAXIMO_DE_AVISOS_NA_TELA);
    expect(avisos.map((a) => a.id)).toEqual(['1-6', '1-5', '1-4']);
  });

  it('rotuloDaQuantidade só aparece a partir de duas mensagens', () => {
    expect(rotuloDaQuantidade(1)).toBe('');
    expect(rotuloDaQuantidade(3)).toBe('3 mensagens novas');
  });
});

describe('atalhoDoTeclado', () => {
  const tecla = (parcial: Partial<{ key: string; code: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }>) => ({
    key: '', code: '', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...parcial,
  });

  it('monta o atalho no formato do Electron, com os modificadores sempre na mesma ordem', () => {
    expect(atalhoDoTeclado(tecla({ key: ' ', code: 'Space', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+Space');
    expect(atalhoDoTeclado(tecla({ key: 'k', code: 'KeyK', shiftKey: true, ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+Shift+K');
    expect(atalhoDoTeclado(tecla({ key: 'F1', code: 'F1', altKey: true }))).toBe('Alt+F1');
    expect(atalhoDoTeclado(tecla({ key: '1', code: 'Digit1', metaKey: true }))).toBe('Super+1');
    expect(atalhoDoTeclado(tecla({ key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true }))).toBe('Ctrl+Up');
  });

  it('letras e dígitos vêm da posição da tecla, não do caractere (Shift+2 não vira Shift+@)', () => {
    expect(atalhoDoTeclado(tecla({ key: '@', code: 'Digit2', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+2');
    expect(atalhoDoTeclado(tecla({ key: 'Ç', code: 'KeyC', altKey: true }))).toBe('Alt+C');
  });

  it('sem modificador, só modificadores ou tecla que o formato não aceita não é atalho', () => {
    expect(atalhoDoTeclado(tecla({ key: 'k', code: 'KeyK' }))).toBeNull();
    expect(atalhoDoTeclado(tecla({ key: 'Control', code: 'ControlLeft', ctrlKey: true }))).toBeNull();
    expect(atalhoDoTeclado(tecla({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }))).toBeNull();
    expect(atalhoDoTeclado(tecla({ key: 'Escape', code: 'Escape', ctrlKey: true }))).toBeNull();
    expect(atalhoDoTeclado(tecla({ key: ';', code: 'Semicolon', ctrlKey: true }))).toBeNull();
    expect(atalhoDoTeclado(tecla({ key: 'F25', code: 'F25', ctrlKey: true }))).toBeNull();
  });
});
