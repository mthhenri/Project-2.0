import type { Knex } from 'knex';

// Complemento do seed de tags padrão (migration 20240017): mais 19 tags
// comuns de desenvolvimento, elevando o catálogo inicial de 14 para 33.
// Mesmo padrão idempotente; cores no formato #RRGGBB (coluna cor VARCHAR(7)).
const TAGS_COMPLEMENTO: ReadonlyArray<{ nome: string; cor: string }> = [
  // Tipos de trabalho
  { nome: 'Inovação',       cor: '#facc15' },
  { nome: 'Manutenção',     cor: '#78716c' },
  { nome: 'Melhoria',       cor: '#84cc16' },
  { nome: 'Hotfix',         cor: '#e11d48' },
  { nome: 'Migração',       cor: '#0f766e' },
  { nome: 'Automação',      cor: '#4d7c0f' },
  { nome: 'Configuração',   cor: '#9a3412' },
  { nome: 'Pesquisa',       cor: '#7c3aed' },
  // Áreas técnicas
  { nome: 'Mobile',         cor: '#2dd4bf' },
  { nome: 'Cloud',          cor: '#38bdf8' },
  { nome: 'Arquitetura',    cor: '#475569' },
  { nome: 'Integração',     cor: '#eab308' },
  // Qualidade
  { nome: 'Acessibilidade', cor: '#16a34a' },
  { nome: 'Monitoramento',  cor: '#0891b2' },
  // Processo e documentação
  { nome: 'Homologação',    cor: '#a16207' },
  { nome: 'Deploy',         cor: '#4f46e5' },
  { nome: 'Revisão',        cor: '#fb7185' },
  { nome: 'Planejamento',   cor: '#a78bfa' },
  { nome: 'Análise',        cor: '#c026d3' },
];

export async function up(knex: Knex): Promise<void> {
  // Idempotente: cada tag só é inserida se ainda não houver uma ativa com o mesmo nome.
  for (const tag of TAGS_COMPLEMENTO) {
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
  // Remove apenas as tags ATIVAS semeadas neste complemento; preserva
  // registros soft-deletados homônimos pré-existentes.
  for (const tag of TAGS_COMPLEMENTO) {
    await knex.raw(
      `DELETE FROM tag WHERE tag.nome = :nome AND tag.is_deleted = false`,
      { nome: tag.nome },
    );
  }
}
