import * as path from 'node:path';
import { app, BrowserWindow, ipcMain, Menu, nativeImage, nativeTheme, screen, shell, Tray } from 'electron';
import { NOME_DO_APP, URL_DO_PROJECT } from './config';
import { montarPaginaDoDialogoDeSaida, RespostaDaSaida, respostaDaNavegacao } from './dialogo-de-saida';
import { decidirFechamento, destinoDaNavegacao, EstadoDeEncerramento, janelaForaDoLugar, limitarAoMonitor, resolverUrlDoProject, textoDoProximoCheckin } from './politica-da-janela';
import { deveConferirVersao, enderecoParaBaixar, lerVersaoPublicada, textoDaAtualizacao, VersaoPublicada } from './politica-da-versao';
import { deveAbrirJanelinha, deveFecharJanelinha, enderecoDaApi, lerEstadoDaIa, lerSituacao, segundosAteOCheckin, SituacaoDoCheckin } from './politica-do-checkin';

const urlDoProject = resolverUrlDoProject(URL_DO_PROJECT, process.env);
const caminhoDoIcone = path.join(__dirname, '..', 'assets', 'icone.png');

const encerramento: EstadoDeEncerramento = { saidaConfirmada: false, encerramentoDoSistema: false };
/** Os tempos da conferência do check-in (a leitura da situação no backend): mais rápida enquanto a janelinha está aberta. */
const CONFERENCIA_OCIOSA_MS = 15_000;
const CONFERENCIA_COM_JANELINHA_MS = 3_000;
const LIMITE_DA_REDE_MS = 8_000;

/** A última situação lida do backend: o menu da bandeja calcula o tempo até o próximo check-in a partir dela. */
let ultimaSituacao: SituacaoDoCheckin | null = null;
/** O executável publicado no servidor (task 198) e quando o desktop conferiu pela última vez; o aviso de versão nova sai daqui. */
let versaoPublicada: VersaoPublicada | null = null;
let ultimaConferenciaDeVersao: number | null = null;
let janelinha: BrowserWindow | null = null;
/** Só quando o check-in terminou (ou deixou de ser exigido) a janelinha pode fechar; antes, fechar é recusado. */
let janelinhaLiberada = false;
let conferencia: NodeJS.Timeout | null = null;

let janela: BrowserWindow | null = null;
let dialogoDeSaida: BrowserWindow | null = null;
let bandeja: Tray | null = null;
let reajustando = false;
let tentativaDeReabrir: NodeJS.Timeout | null = null;

if (!app.requestSingleInstanceLock()) {
  // Já existe um Project Desktop aberto: ele é quem vai para a frente (evento `second-instance`).
  app.quit();
}

function areaDoMonitorPrincipal() {
  return screen.getPrimaryDisplay().workArea;
}

/** Devolve a janela ao monitor principal inteiro (o tamanho de abertura); maximizada, ela já ocupa a área e fica como está. */
function reajustarJanela(): void {
  if (!janela || janela.isDestroyed() || reajustando) return;
  reajustando = true;
  try {
    if (janela.isMinimized() || janela.isMaximized()) return;
    janela.setBounds(areaDoMonitorPrincipal());
  } finally {
    reajustando = false;
  }
}

/**
 * Traz o Project para a frente na área de trabalho atual do Windows: minimiza e restaura, o que o coloca na área em uso
 * (o Windows não deixa uma janela comum "seguir" o usuário entre áreas de trabalho de outro jeito).
 */
function trazerParaAFrente(): void {
  if (!janela || janela.isDestroyed()) {
    criarJanela();
    return;
  }
  janela.minimize();
  janela.restore();
  janela.show();
  reajustarJanela();
  janela.focus();
}

function paginaDeFalha(): string {
  const html = `<!doctype html><meta charset="utf-8"><title>${NOME_DO_APP}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#1c2330;background:#f3f5f8"><div style="text-align:center;max-width:32rem;padding:1rem"><h1 style="font-size:1.25rem">Não foi possível abrir o Project</h1><p>Confira a rede e o endereço do sistema. O app tenta de novo a cada poucos segundos.</p><p style="color:#5d6877;font-size:.875rem">${urlDoProject}</p></div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function criarJanela(): void {
  const area = areaDoMonitorPrincipal();
  janela = new BrowserWindow({
    ...area,
    title: NOME_DO_APP,
    icon: caminhoDoIcone,
    show: false,
    alwaysOnTop: true,
    // No Windows o botão de maximizar só vale com a janela redimensionável; o tamanho continua preso à área (`conferirLugar`).
    resizable: true,
    movable: false,
    maximizable: true,
    fullscreenable: false,
    minimizable: true,
    closable: true,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });

  janela.once('ready-to-show', () => {
    janela?.show();
    reajustarJanela();
  });

  // Nunca fecha por conta própria: fechar e Alt+F4 só minimizam (o sistema desligando e a saída confirmada na bandeja passam).
  janela.on('close', (evento) => {
    if (decidirFechamento(encerramento) === 'minimizar') {
      evento.preventDefault();
      janela?.minimize();
    }
  });
  janela.on('session-end', () => {
    encerramento.encerramentoDoSistema = true;
  });

  // Trava: não arrasta nem encolhe pela borda; maximizar e restaurar valem, e restaurar ou voltar do minimizado devolve o tamanho de abertura.
  janela.on('will-move', (evento) => evento.preventDefault());
  const conferirLugar = () => {
    if (!janela || janela.isDestroyed() || janela.isMinimized() || reajustando) return;
    if (janelaForaDoLugar(janela.getBounds(), areaDoMonitorPrincipal(), janela.isMaximized())) reajustarJanela();
  };
  janela.on('resize', conferirLugar);
  janela.on('move', conferirLugar);
  janela.on('unmaximize', conferirLugar);
  janela.on('restore', () => {
    reajustarJanela();
    // O Project voltou à tela: o check-in passa a ser o diálogo dentro dele, a janelinha separada sai.
    fecharJanelinha();
  });
  screen.on('display-metrics-changed', reajustarJanela);

  // Links externos abrem no navegador do sistema; o Project em si fica na janela.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') void shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (url.startsWith('data:')) return;
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') {
      evento.preventDefault();
      void shell.openExternal(url);
    }
  });

  // Sem rede ou com o front fora do ar: mostra o aviso e tenta de novo sozinho.
  janela.webContents.on('did-fail-load', (_evento, _codigo, _descricao, urlFalha, principal) => {
    if (!principal || urlFalha.startsWith('data:')) return;
    void janela?.loadURL(paginaDeFalha());
    if (tentativaDeReabrir) clearTimeout(tentativaDeReabrir);
    tentativaDeReabrir = setTimeout(() => void janela?.loadURL(urlDoProject), 5000);
  });

  janela.on('closed', () => {
    janela = null;
  });
  void janela.loadURL(urlDoProject);
}

function montarMenuDaBandeja(): Menu {
  const atualizacao = textoDaAtualizacao(versaoPublicada, app.getVersion());
  return Menu.buildFromTemplate([
    { label: 'Abrir o Project', click: trazerParaAFrente },
    { label: textoDoProximoCheckin(segundosAteOCheckin(ultimaSituacao, Date.now())), enabled: false },
    // Há executável mais novo no servidor (task 198): abre o Project no navegador, que inicia o download com o login do usuário.
    ...(atualizacao ? [{ label: atualizacao, click: () => void shell.openExternal(enderecoParaBaixar(urlDoProject)) }] : []),
    { type: 'separator' },
    { label: 'Fechar completamente', click: () => void pedirSaida() },
  ]);
}

/** Única saída do app: confirma que isso desativa o check-in e só então encerra. */
async function pedirSaida(): Promise<void> {
  if (dialogoDeSaida && !dialogoDeSaida.isDestroyed()) {
    dialogoDeSaida.focus();
    return;
  }
  const resposta = await perguntarSaida();
  if (resposta !== 'sair') return;
  encerramento.saidaConfirmada = true;
  app.quit();
}

/** O aviso de saída: uma janelinha própria no estilo do Project (modal sobre o Project quando ele está na tela), e fechá-la é "continuar". */
function perguntarSaida(): Promise<RespostaDaSaida> {
  const pai = janela && !janela.isDestroyed() && janela.isVisible() && !janela.isMinimized() ? janela : undefined;
  const aviso = new BrowserWindow({
    width: 460,
    height: 190,
    parent: pai,
    modal: pai !== undefined,
    title: NOME_DO_APP,
    icon: caminhoDoIcone,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: pai !== undefined,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false },
  });
  dialogoDeSaida = aviso;
  aviso.setAlwaysOnTop(true, 'screen-saver');
  return new Promise<RespostaDaSaida>((resolver) => {
    let resposta: RespostaDaSaida = 'continuar';
    const responder = (valor: RespostaDaSaida) => {
      resposta = valor;
      if (!aviso.isDestroyed()) aviso.close();
    };
    aviso.webContents.on('will-navigate', (evento, endereco) => {
      evento.preventDefault();
      const escolhida = respostaDaNavegacao(endereco);
      if (escolhida) responder(escolhida);
    });
    aviso.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    aviso.webContents.on('before-input-event', (evento, entrada) => {
      if (entrada.type === 'keyDown' && entrada.key === 'Escape') {
        evento.preventDefault();
        responder('continuar');
      }
    });
    aviso.once('ready-to-show', () => {
      aviso.show();
      aviso.focus();
    });
    aviso.on('closed', () => {
      dialogoDeSaida = null;
      resolver(resposta);
    });
    void aviso.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(montarPaginaDoDialogoDeSaida(NOME_DO_APP))}`);
  });
}

function criarBandeja(): void {
  bandeja = new Tray(nativeImage.createFromPath(caminhoDoIcone).resize({ width: 16, height: 16 }));
  bandeja.setToolTip(NOME_DO_APP);
  bandeja.on('click', trazerParaAFrente);
  // O menu é montado na hora de abrir, para o tempo até o check-in estar sempre atual.
  bandeja.on('right-click', () => bandeja?.popUpContextMenu(montarMenuDaBandeja()));
}

/** O Project principal está minimizado ou escondido: o usuário está em outro programa. */
function principalMinimizada(): boolean {
  return !janela || janela.isDestroyed() || janela.isMinimized() || !janela.isVisible();
}

/** O token do login vive no `localStorage` da página do Project; o desktop o lê dali para consultar a API como o próprio usuário. */
async function lerTokenDoLogin(): Promise<string | null> {
  if (!janela || janela.isDestroyed()) return null;
  try {
    const token = await janela.webContents.executeJavaScript("localStorage.getItem('access_token')");
    return typeof token === 'string' && token !== '' ? token : null;
  } catch {
    return null;
  }
}

async function chamarApi(rota: string, token: string): Promise<unknown> {
  try {
    const resposta = await fetch(enderecoDaApi(urlDoProject, rota), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(LIMITE_DA_REDE_MS) });
    return resposta.ok ? await resposta.json() : null;
  } catch {
    return null;
  }
}

/** Abre a janelinha do check-in: pequena, sem moldura, sempre por cima, arrastável, que só fecha quando o check-in termina. */
function abrirJanelinha(): void {
  janelinhaLiberada = false;
  janelinha = new BrowserWindow({
    width: 480,
    height: 560,
    title: 'Hora do check-in',
    icon: caminhoDoIcone,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: true,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });
  // Acima de qualquer outra janela, inclusive de programas em tela cheia.
  janelinha.setAlwaysOnTop(true, 'screen-saver');
  janelinha.center();
  janelinha.once('ready-to-show', () => {
    janelinha?.show();
    janelinha?.focus();
  });
  janelinha.on('close', (evento) => {
    if (!janelinhaLiberada) evento.preventDefault();
  });
  // Arrasta à vontade, mas sem sair do monitor.
  janelinha.on('moved', () => {
    if (!janelinha || janelinha.isDestroyed()) return;
    const atual = janelinha.getBounds();
    const area = screen.getDisplayMatching(atual).workArea;
    const dentro = limitarAoMonitor(atual, area);
    if (dentro.x !== atual.x || dentro.y !== atual.y) janelinha.setBounds(dentro);
  });
  janelinha.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  janelinha.on('closed', () => {
    janelinha = null;
    janelinhaLiberada = false;
    agendarConferencia();
  });
  void janelinha.loadURL(new URL('checkin', urlDoProject).toString());
}

/** Libera e fecha a janelinha (o check-in terminou, ou o Project voltou à tela). */
function fecharJanelinha(): void {
  if (!janelinha || janelinha.isDestroyed()) return;
  janelinhaLiberada = true;
  janelinha.close();
}

/** Confere de hora em hora se o servidor publicou um executável mais novo; falha de rede deixa o aviso como estava. */
async function conferirVersao(token: string): Promise<void> {
  if (!deveConferirVersao(ultimaConferenciaDeVersao, Date.now())) return;
  ultimaConferenciaDeVersao = Date.now();
  const corpo = await chamarApi('desktop/versao', token);
  if (corpo !== null) versaoPublicada = lerVersaoPublicada(corpo);
}

/** Lê a situação do check-in no backend: atualiza a bandeja e abre ou fecha a janelinha conforme a regra pura. */
async function conferirCheckin(): Promise<void> {
  const token = await lerTokenDoLogin();
  if (!token) return;
  await conferirVersao(token);
  const situacao = lerSituacao(await chamarApi('checkin/situacao', token));
  if (situacao) {
    ultimaSituacao = situacao;
    bandeja?.setToolTip(`${NOME_DO_APP}\n${textoDoProximoCheckin(segundosAteOCheckin(situacao, Date.now()))}`);
  }
  const aberta = janelinha !== null && !janelinha.isDestroyed();
  if (aberta) {
    if (deveFecharJanelinha(principalMinimizada(), situacao)) fecharJanelinha();
    return;
  }
  if (!situacao || !principalMinimizada() || !situacao.disparado) return;
  const estadoDaIa = lerEstadoDaIa(await chamarApi('ia/disponibilidade', token));
  if (deveAbrirJanelinha({ principalMinimizada: principalMinimizada(), situacao, estadoDaIa, janelinhaAberta: false })) abrirJanelinha();
}

function agendarConferencia(): void {
  if (conferencia) clearTimeout(conferencia);
  const espera = janelinha && !janelinha.isDestroyed() ? CONFERENCIA_COM_JANELINHA_MS : CONFERENCIA_OCIOSA_MS;
  conferencia = setTimeout(() => {
    void conferirCheckin().finally(agendarConferencia);
  }, espera);
}

ipcMain.on('checkin:encerrar', (evento) => {
  if (janelinha && !janelinha.isDestroyed() && evento.sender === janelinha.webContents) fecharJanelinha();
});

app.on('second-instance', trazerParaAFrente);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  criarJanela();
  criarBandeja();
  agendarConferencia();
});

// Fechar a janela não encerra o app: ele fica na bandeja até "Fechar completamente".
app.on('window-all-closed', () => {
  if (encerramento.saidaConfirmada || encerramento.encerramentoDoSistema) app.quit();
});
