import type { Knex } from 'knex';

// Tags comuns no dia a dia de desenvolvimento, para já popular o sistema
// e evitar o cadastro manual de uma a uma. Cores no formato #RRGGBB
// (coluna cor VARCHAR(7)); o gestor pode editar/excluir qualquer uma depois.
const TAGS_PADRAO: ReadonlyArray<{ nome: string; cor: string }> = [
  { nome: 'Backend',        cor: '#3b82f6' },
  { nome: 'Frontend',       cor: '#8b5cf6' },
  { nome: 'Bug',            cor: '#ef4444' },
  { nome: 'Feature',        cor: '#22c55e' },
  { nome: 'Refatoração',    cor: '#f59e0b' },
  { nome: 'Documentação',   cor: '#0ea5e9' },
  { nome: 'Teste',          cor: '#ec4899' },
  { nome: 'Banco de Dados', cor: '#6366f1' },
  { nome: 'API',            cor: '#06b6d4' },
  { nome: 'Infraestrutura', cor: '#64748b' },
  { nome: 'DevOps',         cor: '#14b8a6' },
  { nome: 'Segurança',      cor: '#dc2626' },
  { nome: 'Performance',    cor: '#f97316' },
  { nome: 'UI/UX',          cor: '#a855f7' },
];

export async function up(knex: Knex): Promise<void> {
  // Idempotente: cada tag só é inserida se ainda não houver uma ativa com o mesmo nome.
  for (const tag of TAGS_PADRAO) {
    await knex.raw(
      `INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
       SELECT :nome, :cor, NOW(), NOW(), false
       WHERE NOT EXISTS (
         SELECT 1 FROM tag
         WHERE tag.nome = :nome
           AND tag.is_deleted = false
       )`,
      { nome: tag.nome, cor: tag.cor },
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove apenas as tags ATIVAS semeadas. O filtro is_deleted = false evita
  // apagar registros soft-deletados homônimos que já existiam antes do seed.
  for (const tag of TAGS_PADRAO) {
    await knex.raw(
      `DELETE FROM tag WHERE tag.nome = :nome AND tag.is_deleted = false`,
      { nome: tag.nome },
    );
  }
}
