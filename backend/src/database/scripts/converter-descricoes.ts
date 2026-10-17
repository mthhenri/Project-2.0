/**
 * Conversão única do HTML do Quill para Markdown nos campos de texto rico (task 123).
 *
 *   npm run db:converter-descricoes --workspace=backend                       # dry-run (padrão): só relata
 *   npm run db:converter-descricoes --workspace=backend -- --aplicar --confirmo-backup
 *
 * Fica fora do runner de migrations (que só executa `.sql`) e **não é reversível**: faça um backup
 * (`pg_dump`) antes de aplicar. É idempotente: só converte o que parece saída do Quill, então rodar de
 * novo não altera o que já é Markdown. Aplica tudo numa transação; cada UPDATE confere o valor lido,
 * para não sobrescrever uma edição feita no meio do caminho.
 */
import knex, { Knex } from 'knex';
import configuracao from '../knexfile';
import { converterHtmlParaMarkdown, pareceHtmlDoQuill, PerdasConversao } from './html-para-markdown';

export interface AlvoDeConversao {
  tabela: string;
  coluna: string;
}

/** Campos onde o Quill gravava HTML. `execucao.descricao` e `ponto_justificativa.descricao` são texto puro. */
export const ALVOS: readonly AlvoDeConversao[] = [
  { tabela: 'demanda', coluna: 'descricao_cliente' },
  { tabela: 'demanda', coluna: 'descricao_tecnica' },
  { tabela: 'demanda', coluna: 'documentacao' },
  { tabela: 'usuario', coluna: 'anotacoes' },
];

export interface ConversaoPlanejada {
  id: number;
  antigo: string;
  novo: string;
  perdas: PerdasConversao;
}

/** Decide, linha a linha, o que converter. Pura: não toca no banco. */
export function planejarConversoes(linhas: { id: number; valor: string | null }[]): ConversaoPlanejada[] {
  const planejadas: ConversaoPlanejada[] = [];
  for (const linha of linhas) {
    if (!pareceHtmlDoQuill(linha.valor)) continue;
    const { markdown, perdas } = converterHtmlParaMarkdown(linha.valor as string);
    if (markdown !== linha.valor) planejadas.push({ id: linha.id, antigo: linha.valor as string, novo: markdown, perdas });
  }
  return planejadas;
}

function resumir(texto: string): string {
  const linha = texto.replace(/\s+/g, ' ').trim();
  return linha.length > 160 ? `${linha.slice(0, 160)}…` : linha;
}

async function lerLinhas(conexao: Knex | Knex.Transaction, alvo: AlvoDeConversao): Promise<{ id: number; valor: string | null }[]> {
  // Inclui as linhas excluídas (soft delete): uma restauração futura não pode trazer HTML de volta.
  const resultado = await conexao.raw(
    'SELECT id, :coluna: AS valor FROM :tabela: WHERE :coluna: IS NOT NULL AND :coluna: <> :vazio ORDER BY id',
    { coluna: alvo.coluna, tabela: alvo.tabela, vazio: '' },
  );
  return resultado.rows;
}

async function principal(): Promise<void> {
  const argumentos = new Set(process.argv.slice(2));
  const aplicar = argumentos.has('--aplicar');
  const confirmouBackup = argumentos.has('--confirmo-backup');

  if (aplicar && !confirmouBackup) {
    console.error(
      'Recusado: esta conversão não é reversível. Faça um backup (pg_dump) e rode de novo com --aplicar --confirmo-backup.',
    );
    process.exitCode = 1;
    return;
  }

  const conexao = knex(configuracao);
  try {
    console.log(aplicar ? '== APLICANDO a conversão HTML → Markdown ==' : '== DRY-RUN (nada será alterado) ==');
    const total: PerdasConversao = { sublinhado: 0, imagens: 0, linksRemovidos: 0 };
    let convertidas = 0;

    const transacao = await conexao.transaction();
    try {
      for (const alvo of ALVOS) {
        const linhas = await lerLinhas(transacao, alvo);
        const planejadas = planejarConversoes(linhas);
        console.log(`\n${alvo.tabela}.${alvo.coluna}: ${linhas.length} preenchidas, ${planejadas.length} a converter`);

        for (const plano of planejadas.slice(0, 3)) {
          console.log(`  #${plano.id} antes: ${resumir(plano.antigo)}`);
          console.log(`  #${plano.id} depois: ${resumir(plano.novo)}`);
        }

        for (const plano of planejadas) {
          total.sublinhado += plano.perdas.sublinhado;
          total.imagens += plano.perdas.imagens;
          total.linksRemovidos += plano.perdas.linksRemovidos;
          if (!aplicar) continue;
          // O trigger de updated_date roda; `usuario.anotacoes_alteracao_data` (última edição do dono) não é tocada.
          const afetadas = await transacao.raw(
            'UPDATE :tabela: SET :coluna: = :novo WHERE id = :id AND :coluna: = :antigo',
            { tabela: alvo.tabela, coluna: alvo.coluna, novo: plano.novo, id: plano.id, antigo: plano.antigo },
          );
          if (afetadas.rowCount !== 1) {
            throw new Error(`${alvo.tabela}.${alvo.coluna} #${plano.id} mudou durante a conversão; nada foi aplicado.`);
          }
        }
        convertidas += planejadas.length;
      }
      if (aplicar) await transacao.commit();
      else await transacao.rollback();
    } catch (erro) {
      await transacao.rollback();
      throw erro;
    }

    console.log(`\nTotal ${aplicar ? 'convertido' : 'a converter'}: ${convertidas}`);
    console.log(
      `Perdas (marcação sem equivalente em Markdown): sublinhado ${total.sublinhado}, imagens ${total.imagens}, links removidos ${total.linksRemovidos}`,
    );
    if (!aplicar) console.log('\nFaça um backup (pg_dump) e rode com --aplicar --confirmo-backup para converter.');
  } finally {
    await conexao.destroy();
  }
}

if (require.main === module) {
  principal().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
}
