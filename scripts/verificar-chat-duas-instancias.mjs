// Roteiro de verificação da task 215: duas instâncias da API, mesmo PostgreSQL, CHAT_EVENTOS=postgres, dois clientes de stream.
// Uso: node scripts/verificar-chat-duas-instancias.mjs <opensearch|elasticsearch|postgres> [--completo]
// Sobe as duas instâncias em portas próprias (3100 e 3101), cria usuários descartáveis (sufixo do instante) e confere a entrega entre instâncias,
// o "Lida", a presença, a recuperação depois da queda do stream sem perda nem duplicata e o SIGTERM. `--completo` espera também a presença
// expirar depois de um SIGKILL (até ~80 s). Não escreve nada fora do banco de desenvolvimento e das próprias mensagens de teste.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const armazenamento = process.argv[2];
const completo = process.argv.includes('--completo');
// `--conteiner-a`: a instância A roda num contêiner Linux (volume `p215-app`, com as dependências instaladas no Linux) e o SIGTERM é o `docker stop`.
// No Windows `kill('SIGTERM')` mata o processo sem rodar os ganchos de encerramento, então só o contêiner prova o encerramento ordenado.
const conteinerA = process.argv.includes('--conteiner-a');
if (!['opensearch', 'elasticsearch', 'postgres'].includes(armazenamento)) {
  console.error('Uso: node scripts/verificar-chat-duas-instancias.mjs <opensearch|elasticsearch|postgres> [--completo]');
  process.exit(2);
}

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA_A = 3100;
const PORTA_B = 3101;
const sufixo = Date.now().toString().slice(-6);
const resultados = [];
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function registrar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok });
  console.log(`${ok ? 'OK   ' : 'FALHA'} [${armazenamento}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}

function subirEmConteiner(porta) {
  const nome = `p215-a-${porta}`;
  spawn('docker', ['rm', '-f', nome], { stdio: 'ignore' });
  const argumentos = [
    'run', '--rm', '--name', nome, '-p', `${porta}:${porta}`, '--env-file', resolve(raiz, '.env'), '-v', 'p215-app:/app', '-w', '/app/backend',
    '-e', 'DB_HOST=host.docker.internal', '-e', `PORT=${porta}`, '-e', 'CHAT_EVENTOS=postgres', '-e', `CHAT_ARMAZENAMENTO=${armazenamento}`,
    '-e', 'OPENSEARCH_URL=http://host.docker.internal:9200', '-e', 'ELASTICSEARCH_URL=http://host.docker.internal:9201',
    'node:22', 'node', '--require', 'ts-node/register/transpile-only', 'src/main.ts',
  ];
  const processo = spawn('docker', argumentos, { stdio: ['ignore', 'pipe', 'pipe'] });
  const saida = [];
  processo.stdout.on('data', (trecho) => saida.push(String(trecho)));
  processo.stderr.on('data', (trecho) => saida.push(String(trecho)));
  const encerrou = new Promise((resolver) => processo.on('exit', (codigo, sinal) => resolver({ codigo, sinal })));
  const parar = () => spawn('docker', ['stop', '-t', '20', nome], { stdio: 'ignore' });
  return { processo, porta, saida, encerrou, conteiner: nome, termo: parar, matar: () => spawn('docker', ['rm', '-f', nome], { stdio: 'ignore' }) };
}

function subir(porta, emConteiner = false) {
  if (emConteiner) return subirEmConteiner(porta);
  const processo = spawn(process.execPath, ['--require', 'ts-node/register/transpile-only', 'src/main.ts'], {
    cwd: resolve(raiz, 'backend'),
    env: { ...process.env, PORT: String(porta), CHAT_EVENTOS: 'postgres', CHAT_ARMAZENAMENTO: armazenamento, ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9201' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const saida = [];
  processo.stdout.on('data', (trecho) => saida.push(String(trecho)));
  processo.stderr.on('data', (trecho) => saida.push(String(trecho)));
  const encerrou = new Promise((resolver) => processo.on('exit', (codigo, sinal) => resolver({ codigo, sinal })));
  return { processo, porta, saida, encerrou };
}

async function esperarNoAr(instancia) {
  for (let tentativa = 0; tentativa < 90; tentativa++) {
    try {
      const resposta = await fetch(`http://localhost:${instancia.porta}/api/v1/autenticacao/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (resposta.status > 0) return;
    } catch { /* ainda subindo */ }
    await dormir(2000);
  }
  throw new Error(`a instância da porta ${instancia.porta} não subiu:\n${instancia.saida.join('').slice(-1500)}`);
}

async function chamar(porta, metodo, caminho, token, corpo) {
  const resposta = await fetch(`http://localhost:${porta}/api/v1${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* vazio */ }
  return { status: resposta.status, json };
}

/** Abre o stream de eventos e junta os eventos recebidos; `parar()` simula a queda do cliente. */
function abrirStream(porta, token) {
  const controlador = new AbortController();
  const eventos = [];
  const fim = (async () => {
    try {
      const resposta = await fetch(`http://localhost:${porta}/api/v1/mensagem-direta/eventos`, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: controlador.signal });
      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let pendente = '';
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        let corte;
        while ((corte = pendente.indexOf('\n\n')) >= 0) {
          const bloco = pendente.slice(0, corte);
          pendente = pendente.slice(corte + 2);
          for (const linha of bloco.split('\n')) {
            if (linha.startsWith('data: ')) eventos.push({ em: Date.now(), ...JSON.parse(linha.slice(6)) });
          }
        }
      }
    } catch { /* abortado ou encerrado */ }
  })();
  return { eventos, fim, parar: () => controlador.abort() };
}

async function esperarEvento(stream, predicado, limiteMs = 5000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    const achado = stream.eventos.find(predicado);
    if (achado) return achado;
    await dormir(100);
  }
  return null;
}

const instanciaA = subir(PORTA_A, conteinerA);
const instanciaB = subir(PORTA_B);
const todas = [instanciaA, instanciaB];

try {
  await Promise.all(todas.map(esperarNoAr));
  registrar('as duas instâncias sobem (portas 3100 e 3101, CHAT_EVENTOS=postgres)', true);

  const login = async (porta, usuario, senha) => (await chamar(porta, 'POST', '/autenticacao/login', null, { login: usuario, senha })).json.dados;
  const admin = await login(PORTA_A, 'gestor.inicial', 'project2026');
  const criar = async (apelido) => {
    const r = await chamar(PORTA_A, 'POST', '/usuario', admin.accessToken, {
      login: `${apelido}.${sufixo}`, senhaNaoEncriptada: 'Senha@12345', nomeCompleto: `${apelido} 215`, cargoTitulo: 'Teste 215', tipo: 'DESENVOLVEDOR', horasDiariasNecessarias: 8,
    });
    if (r.status >= 300) throw new Error(`criar ${apelido}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.dados;
  };
  const ana = await criar('ana');
  const bruno = await criar('bruno');
  const tokenAna = (await login(PORTA_A, `ana.${sufixo}`, 'Senha@12345')).accessToken;
  const tokenBruno = (await login(PORTA_B, `bruno.${sufixo}`, 'Senha@12345')).accessToken;

  // Ana na instância A, Bruno na B.
  const streamAna = abrirStream(PORTA_A, tokenAna);
  let streamBruno = abrirStream(PORTA_B, tokenBruno);
  registrar('o primeiro evento de cada stream é ABERTURA', !!(await esperarEvento(streamAna, (e) => e.tipo === 'ABERTURA')) && !!(await esperarEvento(streamBruno, (e) => e.tipo === 'ABERTURA')));

  registrar('presença entre instâncias: Ana (em A) vê Bruno (em B) online', !!(await esperarEvento(streamAna, (e) => e.tipo === 'PRESENCA' && e.usuarioId === bruno.id && e.online === true, 8000))
    || streamAna.eventos.some((e) => e.tipo === 'ABERTURA' && e.onlineUsuarioIds.includes(bruno.id)));

  // Mensagem de A para quem está em B.
  const enviar = (porta, token, destinatarioId, texto) => chamar(porta, 'POST', '/mensagem-direta/mensagem', token, { mensagemId: randomUUID(), destinatarioId, texto });
  const primeira = await enviar(PORTA_A, tokenAna, bruno.id, 'Primeira mensagem, enviada pela instância A');
  const chegou = await esperarEvento(streamBruno, (e) => e.tipo === 'MENSAGEM' && e.mensagem.mensagemId === primeira.json?.dados?.mensagem?.mensagemId);
  registrar('mensagem enviada na instância A chega ao destinatário ligado na instância B', !!chegou, chegou ? '' : 'não chegou');

  // "Lida" de volta, de B para A.
  const lidaAteDate = primeira.json.dados.mensagem.createdDate;
  await chamar(PORTA_B, 'PUT', `/mensagem-direta/conversa/${ana.id}/leitura`, tokenBruno, { lidaAteDate });
  registrar('LEITURA marcada em B volta ao remetente em A', !!(await esperarEvento(streamAna, (e) => e.tipo === 'LEITURA' && e.usuarioId === bruno.id)));

  // Contagem enviada = recebida (stream ligado), vinte mensagens alternando as instâncias.
  const enviadas = new Set([primeira.json.dados.mensagem.mensagemId]);
  for (let n = 1; n <= 20; n++) {
    const deAna = n % 2 === 1;
    const r = deAna ? await enviar(PORTA_A, tokenAna, bruno.id, `Mensagem ${n} de Ana`) : await enviar(PORTA_B, tokenBruno, ana.id, `Mensagem ${n} de Bruno`);
    enviadas.add(r.json.dados.mensagem.mensagemId);
  }
  await dormir(1500);
  const vistasPorBruno = new Set(streamBruno.eventos.filter((e) => e.tipo === 'MENSAGEM').map((e) => e.mensagem.mensagemId));
  registrar('21 mensagens alternando as instâncias: o stream de Bruno recebe todas (as dele em outra aba também)', [...enviadas].every((id) => vistasPorBruno.has(id)), `${vistasPorBruno.size}/${enviadas.size}`);

  // Queda do stream do Bruno: mensagens durante a queda são recuperadas relendo a conversa.
  const antesDaQueda = streamBruno.eventos.length;
  streamBruno.parar();
  await streamBruno.fim;
  for (let n = 1; n <= 5; n++) {
    const r = await enviar(PORTA_A, tokenAna, bruno.id, `Durante a queda ${n}`);
    enviadas.add(r.json.dados.mensagem.mensagemId);
  }
  streamBruno = abrirStream(PORTA_B, tokenBruno);
  registrar('depois da queda o stream reconecta e abre com ABERTURA', !!(await esperarEvento(streamBruno, (e) => e.tipo === 'ABERTURA')), `${antesDaQueda} eventos antes da queda`);
  const recuperadas = [];
  let cursor = null;
  do {
    const pagina = await chamar(PORTA_B, 'GET', `/mensagem-direta/conversa/${ana.id}?limite=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, tokenBruno);
    recuperadas.push(...pagina.json.dados.mensagens.map((m) => m.mensagemId));
    cursor = pagina.json.dados.proximoCursor;
  } while (cursor);
  registrar('recuperação pela conversa: enviadas = recuperadas, sem perda e sem duplicata', recuperadas.length === enviadas.size && new Set(recuperadas).size === recuperadas.length && [...enviadas].every((id) => recuperadas.includes(id)), `${recuperadas.length}/${enviadas.size}`);

  // Reenvio idempotente do mesmo mensagemId.
  const repetida = [...enviadas][0];
  const reenvio = await chamar(PORTA_A, 'POST', '/mensagem-direta/mensagem', tokenAna, { mensagemId: repetida, destinatarioId: bruno.id, texto: 'Primeira mensagem, enviada pela instância A' });
  registrar('reenviar o mesmo mensagemId não duplica (jaExistia)', reenvio.json?.dados?.jaExistia === true);

  // SIGTERM na instância A: ENCERRANDO e processo termina.
  const inicioDoTerm = Date.now();
  if (instanciaA.termo) instanciaA.termo();
  else instanciaA.processo.kill('SIGTERM');
  const encerrando = await esperarEvento(streamAna, (e) => e.tipo === 'ENCERRANDO', 15000);
  const saidaDeA = await Promise.race([instanciaA.encerrou, dormir(20000).then(() => null)]);
  registrar('SIGTERM na instância A entrega ENCERRANDO ao stream', !!encerrando);
  registrar('a instância A encerra sem travar', saidaDeA !== null && (!conteinerA || saidaDeA.codigo === 0), saidaDeA ? `código ${saidaDeA.codigo ?? saidaDeA.sinal}` : 'não saiu em 20 s');

  // Presença por expiração: matar B de vez e esperar Bruno sair de online para quem está em A... A já caiu; sobe-se uma C no lugar.
  if (completo) {
    const instanciaC = subir(PORTA_A, false);
    todas.push(instanciaC);
    await esperarNoAr(instanciaC);
    const streamAnaEmC = abrirStream(PORTA_A, tokenAna);
    const abertura = await esperarEvento(streamAnaEmC, (e) => e.tipo === 'ABERTURA');
    const viaBruno = abertura?.onlineUsuarioIds?.includes(bruno.id) || !!(await esperarEvento(streamAnaEmC, (e) => e.tipo === 'PRESENCA' && e.usuarioId === bruno.id && e.online === true, 10000));
    registrar('instância nova (C, no lugar da A) já enxerga Bruno online na B', viaBruno);
    const inicioDaQueda = Date.now();
    instanciaB.processo.kill('SIGKILL');
    streamBruno.parar();
    const saiu = await esperarEvento(streamAnaEmC, (e) => e.tipo === 'PRESENCA' && e.usuarioId === bruno.id && e.online === false, 110000);
    registrar('matar a instância B tira Bruno de online nas outras em até ~80 s', !!saiu, saiu ? `${Math.round((saiu.em - inicioDaQueda) / 1000)} s` : 'não saiu em 110 s');
    streamAnaEmC.parar();
  }
  streamAna.parar();
  streamBruno.parar();
} catch (erro) {
  registrar('roteiro sem exceção', false, String(erro?.stack ?? erro).slice(0, 800));
} finally {
  for (const instancia of todas) {
    if (instancia.matar) instancia.matar();
    if (instancia.processo.exitCode === null && instancia.processo.signalCode === null) instancia.processo.kill('SIGKILL');
  }
}

const falhas = resultados.filter((resultado) => !resultado.ok).length;
console.log(`\n${resultados.length - falhas}/${resultados.length} verificações OK em ${armazenamento}${completo ? ' (completo)' : ''}`);
process.exit(falhas === 0 ? 0 : 1);
