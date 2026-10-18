import * as path from 'node:path';
import { app, BrowserWindow, dialog, Menu, nativeImage, screen, shell, Tray } from 'electron';
import { NOME_DO_APP, URL_DO_PROJECT } from './config';
import { decidirFechamento, destinoDaNavegacao, EstadoDeEncerramento, janelaForaDoLugar, resolverUrlDoProject, textoDoProximoCheckin } from './politica-da-janela';

const urlDoProject = resolverUrlDoProject(URL_DO_PROJECT, process.env);
const caminhoDoIcone = path.join(__dirname, '..', 'assets', 'icone.png');

const encerramento: EstadoDeEncerramento = { saidaConfirmada: false, encerramentoDoSistema: false };
/** Segundos até o próximo check-in; o backend passa a informar na task 161 (até lá, a bandeja mostra "indisponível"). */
let proximoCheckinEmSegundos: number | null = null;

let janela: BrowserWindow | null = null;
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

/** Devolve a janela ao monitor principal inteiro, maximizada e sem mover. */
function reajustarJanela(): void {
  if (!janela || janela.isDestroyed() || reajustando) return;
  reajustando = true;
  try {
    const area = areaDoMonitorPrincipal();
    if (janela.isMinimized()) return;
    janela.setBounds(area);
    if (!janela.isMaximized()) janela.maximize();
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
    resizable: false,
    movable: false,
    maximizable: false,
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

  // Trava física: não arrasta, não encolhe, e voltar do minimizado devolve o tamanho cheio.
  janela.on('will-move', (evento) => evento.preventDefault());
  janela.on('will-resize', (evento) => evento.preventDefault());
  const conferirLugar = () => {
    if (!janela || janela.isDestroyed() || janela.isMinimized() || reajustando) return;
    if (janelaForaDoLugar(janela.getBounds(), areaDoMonitorPrincipal(), janela.isMaximized())) reajustarJanela();
  };
  janela.on('resize', conferirLugar);
  janela.on('move', conferirLugar);
  janela.on('unmaximize', conferirLugar);
  janela.on('restore', reajustarJanela);
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
  return Menu.buildFromTemplate([
    { label: 'Abrir o Project', click: trazerParaAFrente },
    { label: textoDoProximoCheckin(proximoCheckinEmSegundos), enabled: false },
    { type: 'separator' },
    { label: 'Fechar completamente', click: () => void pedirSaida() },
  ]);
}

/** Única saída do app: confirma que isso desativa o check-in e só então encerra. */
async function pedirSaida(): Promise<void> {
  const opcoes = {
    type: 'warning' as const,
    title: 'Fechar o Project Desktop?',
    message: 'Fechar o Project Desktop?',
    detail: 'Isso desativa o check-in. Ele só volta quando você abrir o aplicativo de novo.',
    buttons: ['Fechar completamente', 'Continuar usando'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  };
  const resposta = janela && !janela.isDestroyed() && janela.isVisible() ? await dialog.showMessageBox(janela, opcoes) : await dialog.showMessageBox(opcoes);
  if (resposta.response !== 0) return;
  encerramento.saidaConfirmada = true;
  app.quit();
}

function criarBandeja(): void {
  bandeja = new Tray(nativeImage.createFromPath(caminhoDoIcone).resize({ width: 16, height: 16 }));
  bandeja.setToolTip(NOME_DO_APP);
  bandeja.setContextMenu(montarMenuDaBandeja());
  bandeja.on('click', trazerParaAFrente);
}

app.on('second-instance', trazerParaAFrente);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  criarJanela();
  criarBandeja();
});

// Fechar a janela não encerra o app: ele fica na bandeja até "Fechar completamente".
app.on('window-all-closed', () => {
  if (encerramento.saidaConfirmada || encerramento.encerramentoDoSistema) app.quit();
});
