import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
    avisoEhDaConversaAberta, conversaDoAviso, decidirAtalho, enderecoDaJanelaDeChat, lerAvisoDoChat, lerCaminhoDoProject, lerConversaAbertaDoChat, lerPreferenciaDoChat,
    planoDoAtalho, posicaoDaJanelaDeChat, prepararAreaDeTransferencia, textoDoItemDoChat, tituloDaNotificacao, LIMITE_DO_TEXTO,
} from './politica-do-chat';

const PREFERENCIA = { atalhoGlobal: 'Ctrl+Shift+Space', avisoDesktopAtivo: true, avisosAtivos: true, somAtivo: false, silenciadoAteDate: null };

test('lê a preferência da API e recusa o que não tem o formato ou traz atalho inválido', () => {
    assert.deepEqual(lerPreferenciaDoChat({ dados: PREFERENCIA }), PREFERENCIA);
    assert.equal(lerPreferenciaDoChat({ dados: { ...PREFERENCIA, silenciadoAteDate: '2026-10-21T12:00:00Z' } })?.silenciadoAteDate, '2026-10-21T12:00:00Z');
    for (const atalhoGlobal of ['Space', 'Ctrl', 'Ctrl+', '', 'Ctrl+Shift', 'Ctrl+Shift+Space+K', 7]) {
        assert.equal(lerPreferenciaDoChat({ dados: { ...PREFERENCIA, atalhoGlobal } }), null, String(atalhoGlobal));
    }
    assert.equal(lerPreferenciaDoChat({ dados: { ...PREFERENCIA, somAtivo: 'sim' } }), null);
    assert.equal(lerPreferenciaDoChat(null), null);
    assert.equal(lerPreferenciaDoChat({}), null);
});

test('o atalho abre a janela só com o Project fora da tela, o popup interno com ele visível e fecha a janela aberta', () => {
    assert.equal(decidirAtalho({ janelaDeChatVisivel: false, principalVisivel: false }), 'ABRIR_JANELA');
    assert.equal(decidirAtalho({ janelaDeChatVisivel: false, principalVisivel: true }), 'ABRIR_POPUP_INTERNO');
    assert.equal(decidirAtalho({ janelaDeChatVisivel: true, principalVisivel: false }), 'FECHAR_JANELA');
    assert.equal(decidirAtalho({ janelaDeChatVisivel: true, principalVisivel: true }), 'FECHAR_JANELA');
});

test('o texto copiado vai sem as pontas em branco, e vazio ou grande demais não vai', () => {
    assert.equal(prepararAreaDeTransferencia('  \nconst a = 1;\nconst b = 2;  \n\n'), 'const a = 1;\nconst b = 2;');
    assert.equal(prepararAreaDeTransferencia('    indentado\n  mais'), '    indentado\n  mais');
    assert.equal(prepararAreaDeTransferencia(''), null);
    assert.equal(prepararAreaDeTransferencia(' \n\t '), null);
    assert.equal(prepararAreaDeTransferencia('x'.repeat(LIMITE_DO_TEXTO)), null);
    assert.notEqual(prepararAreaDeTransferencia('x'.repeat(100)), null);
});

test('o plano do atalho só mexe no que mudou', () => {
    assert.deepEqual(planoDoAtalho(null, 'Alt+F1'), { soltar: null, registrar: 'Alt+F1' });
    assert.deepEqual(planoDoAtalho('Alt+F1', 'Alt+F1'), { soltar: null, registrar: null });
    assert.deepEqual(planoDoAtalho('Alt+F1', 'Ctrl+Shift+K'), { soltar: 'Alt+F1', registrar: 'Ctrl+Shift+K' });
    assert.deepEqual(planoDoAtalho('Alt+F1', null), { soltar: 'Alt+F1', registrar: null });
    assert.deepEqual(planoDoAtalho(null, null), { soltar: null, registrar: null });
});

test('valida o aviso pedido pela página', () => {
    const aviso = { usuarioId: 9, usuarioNome: ' Camila Duarte ', texto: 'Oi!', mencionaVoce: true, som: true };
    assert.deepEqual(lerAvisoDoChat(aviso), { usuarioId: 9, usuarioNome: 'Camila Duarte', texto: 'Oi!', mencionaVoce: true, som: true, grupoId: null });
    assert.equal(lerAvisoDoChat({ ...aviso, mencionaVoce: 'sim', som: 1 })?.mencionaVoce, false);
    assert.equal(lerAvisoDoChat({ ...aviso, texto: 'x'.repeat(500) })?.texto.length, 200);
    for (const ruim of [null, 'texto', { ...aviso, usuarioId: 0 }, { ...aviso, usuarioId: 1.5 }, { ...aviso, usuarioId: '9' }, { ...aviso, usuarioNome: '  ' }, { ...aviso, texto: '' }]) {
        assert.equal(lerAvisoDoChat(ruim), null, JSON.stringify(ruim));
    }
});

test('o aviso de grupo leva o grupoId; um grupoId inválido derruba o aviso inteiro (nunca abre a conversa errada)', () => {
    const aviso = { usuarioId: 9, usuarioNome: 'Time do backend', texto: 'Camila: oi', mencionaVoce: false, som: false };
    assert.equal(lerAvisoDoChat({ ...aviso, grupoId: 7 })?.grupoId, 7);
    assert.equal(lerAvisoDoChat({ ...aviso, grupoId: null })?.grupoId, null);
    for (const ruim of [0, -3, 1.5, '7', {}, true]) assert.equal(lerAvisoDoChat({ ...aviso, grupoId: ruim }), null, JSON.stringify(ruim));
});

test('o título da notificação diz quem mencionou: a pessoa na conversa um a um e o grupo no grupo', () => {
    const base = { usuarioId: 9, usuarioNome: 'Camila', texto: 'oi', mencionaVoce: false, som: false, grupoId: null };
    assert.equal(tituloDaNotificacao(base), 'Camila');
    assert.equal(tituloDaNotificacao({ ...base, mencionaVoce: true }), 'Camila mencionou você');
    assert.equal(tituloDaNotificacao({ ...base, usuarioNome: 'Time', grupoId: 7 }), 'Time');
    assert.equal(tituloDaNotificacao({ ...base, usuarioNome: 'Time', grupoId: 7, mencionaVoce: true }), 'Mencionaram você em Time');
});

test('o clique na notificação abre a pessoa, ou o grupo quando o aviso era de um', () => {
    const base = { usuarioId: 9, usuarioNome: 'Camila', texto: 'oi', mencionaVoce: false, som: false, grupoId: null };
    assert.deepEqual(conversaDoAviso(base), { usuarioId: 9, usuarioNome: 'Camila' });
    assert.deepEqual(conversaDoAviso({ ...base, usuarioNome: 'Time', grupoId: 7 }), { usuarioId: 9, usuarioNome: 'Time', grupoId: 7 });
});

test('valida a conversa à vista e monta o endereço da janela de chat', () => {
    assert.deepEqual(lerConversaAbertaDoChat(9), { usuarioId: 9 });
    assert.deepEqual(lerConversaAbertaDoChat({ grupoId: 7 }), { grupoId: 7 });
    for (const ruim of [null, undefined, 0, -1, 1.5, '9', {}, { grupoId: 0 }, { grupoId: '7' }, { grupoId: 1.5 }, []]) assert.equal(lerConversaAbertaDoChat(ruim), null, JSON.stringify(ruim));
    assert.equal(enderecoDaJanelaDeChat('http://localhost:4200/', null), 'http://localhost:4200/chat-popup');
    assert.equal(enderecoDaJanelaDeChat('http://localhost:4200/', { usuarioId: 9, usuarioNome: 'Camila Duarte' }), 'http://localhost:4200/chat-popup?usuarioId=9&nome=Camila+Duarte');
    assert.equal(enderecoDaJanelaDeChat('http://localhost:4200/', { usuarioId: 9, usuarioNome: 'Time do backend', grupoId: 7 }), 'http://localhost:4200/chat-popup?grupoId=7&nome=Time+do+backend');
});

test('o aviso da conversa que a janela de chat já mostra não vira notificação, e o de outro grupo ou pessoa vira', () => {
    const daPessoa = { usuarioId: 9, usuarioNome: 'Camila', texto: 'oi', mencionaVoce: false, som: false, grupoId: null };
    const doGrupo = { ...daPessoa, usuarioNome: 'Time', grupoId: 7 };
    assert.equal(avisoEhDaConversaAberta(daPessoa, { usuarioId: 9 }), true);
    assert.equal(avisoEhDaConversaAberta(daPessoa, { usuarioId: 4 }), false);
    assert.equal(avisoEhDaConversaAberta(doGrupo, { grupoId: 7 }), true);
    assert.equal(avisoEhDaConversaAberta(doGrupo, { grupoId: 8 }), false);
    // O grupo aberto não cala a conversa um a um com o autor da mensagem do grupo, nem o contrário.
    assert.equal(avisoEhDaConversaAberta(doGrupo, { usuarioId: 9 }), false);
    assert.equal(avisoEhDaConversaAberta(daPessoa, { grupoId: 7 }), false);
    assert.equal(avisoEhDaConversaAberta(daPessoa, null), false);
    assert.equal(avisoEhDaConversaAberta(doGrupo, null), false);
});

test('o Project só abre rotas internas pedidas pela janela de chat', () => {
    assert.equal(lerCaminhoDoProject('/atividade/57'), '/atividade/57');
    assert.equal(lerCaminhoDoProject('/demanda?projetoId=5'), '/demanda?projetoId=5');
    for (const ruim of ['https://exemplo.com/', '//exemplo.com', '/\\exemplo', 'atividade/1', '/chat-popup', '/chat-popup?x=1', '/checkin', '/a\nb', 7, null, '/' + 'a'.repeat(400)]) {
        assert.equal(lerCaminhoDoProject(ruim), null, String(ruim));
    }
});

test('a janela de chat fica no canto inferior direito da área útil, sem passar dela', () => {
    const area = { x: 0, y: 0, width: 1920, height: 1040 };
    assert.deepEqual(posicaoDaJanelaDeChat(area, 420, 640), { x: 1476, y: 376, width: 420, height: 640 });
    assert.deepEqual(posicaoDaJanelaDeChat({ x: 1920, y: 0, width: 1366, height: 728 }, 420, 640), { x: 2842, y: 64, width: 420, height: 640 });
    assert.deepEqual(posicaoDaJanelaDeChat({ x: 0, y: 0, width: 400, height: 500 }, 420, 640), { x: 0, y: 0, width: 400, height: 500 });
});

test('o item da bandeja mostra o atalho ou o motivo de não haver', () => {
    assert.equal(textoDoItemDoChat('Ctrl+Shift+Space', true), 'Chat com colegas (Ctrl+Shift+Space)');
    assert.equal(textoDoItemDoChat('Alt+F1', false), 'Chat com colegas (atalho Alt+F1 indisponível)');
    assert.equal(textoDoItemDoChat(null, false), 'Chat com colegas (entre no Project)');
});
