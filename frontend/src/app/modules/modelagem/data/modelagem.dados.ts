// GERADO por `npm run modelagem` (backend/src/database/scripts/gerar-modelagem.ts) a partir do banco migrado.
// Não edite à mão: grupos e posições ficam em backend/src/database/scripts/modelagem.config.json.
import type { ModelagemDiagrama } from '@project20/shared';

export const DIAGRAMA_MODELAGEM: ModelagemDiagrama = {
  "origem": "PostgreSQL · última migration: 0051 - Mensagem direta provisoria em Postgres",
  "colunasOcultas": [
    "created_date",
    "updated_date",
    "is_deleted",
    "deleted_date"
  ],
  "avisos": [],
  "grupos": [
    {
      "id": "dom",
      "titulo": "Domínio: projetos, demandas, atividades e execuções",
      "rotulo": "Domínio"
    },
    {
      "id": "usr",
      "titulo": "Usuários, ponto e anotações",
      "rotulo": "Usuários e ponto"
    },
    {
      "id": "cal",
      "titulo": "Calendário",
      "rotulo": "Calendário"
    },
    {
      "id": "ia",
      "titulo": "IA",
      "rotulo": "IA"
    },
    {
      "id": "chat",
      "titulo": "Chat (armazenamento provisório; sem FK para o domínio)",
      "rotulo": "Chat (provisório)"
    }
  ],
  "tabelas": [
    {
      "nome": "anotacao",
      "grupo": "usr",
      "largura": 210,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "tipo_anotacao_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_anotacao"
        },
        {
          "nome": "texto",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1420,
      "y": 600
    },
    {
      "nome": "atividade",
      "grupo": "dom",
      "largura": 310,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "demanda_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "nome",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_atividade_status_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_atividade_status"
        },
        {
          "nome": "tipo_atividade_prioridade_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_atividade_prioridade"
        }
      ],
      "x": 800,
      "y": 320
    },
    {
      "nome": "atividade_tag",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "atividade_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "atividade"
        },
        {
          "nome": "tag_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tag"
        }
      ],
      "x": 800,
      "y": 640
    },
    {
      "nome": "chat_conversa",
      "grupo": "chat",
      "largura": 210,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "conversa_id",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "lg",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "titulo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "titulo_editado",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 800,
      "y": 1000
    },
    {
      "nome": "chat_mensagem",
      "grupo": "chat",
      "largura": 210,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "mensagem_id",
          "tipo": "uuid",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "conversa_id",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "lg",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "contexto",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "autor",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "texto",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "nivel",
          "tipo": "varchar?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "modelo",
          "tipo": "varchar?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tokens_entrada",
          "tipo": "int?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tokens_saida",
          "tipo": "int?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tokens_cache",
          "tipo": "int?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "proposta_id",
          "tipo": "int?",
          "marca": "lg",
          "tabelaReferenciada": "proposta_ia"
        },
        {
          "nome": "execucao_id",
          "tipo": "int?",
          "marca": "lg",
          "tabelaReferenciada": "execucao"
        },
        {
          "nome": "atividade_id",
          "tipo": "int?",
          "marca": "lg",
          "tabelaReferenciada": "atividade"
        },
        {
          "nome": "demanda_id",
          "tipo": "int?",
          "marca": "lg",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "conteudo_bruto",
          "tipo": "jsonb?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "assunto",
          "tipo": "varchar?",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 800,
      "y": 1170
    },
    {
      "nome": "configuracao_ia",
      "grupo": "ia",
      "largura": 300,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "versao",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_provedor_ia_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_provedor_ia"
        },
        {
          "nome": "esforco_analitico",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "checkin_minimo_minutos",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "checkin_maximo_minutos",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "duracao_recomendada_minutos",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "checkin_inteligente",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "rigor_proporcional",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "deteccao_automatica",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "ia_desligada",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "duvidas_codigo",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "modo_contexto_chat",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "precos_modelo",
          "tipo": "jsonb",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "modelos_provedor",
          "tipo": "jsonb",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "fallbacks",
          "tipo": "jsonb",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1790,
      "y": 60
    },
    {
      "nome": "demanda",
      "grupo": "dom",
      "largura": 270,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "projeto_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "projeto"
        },
        {
          "nome": "demanda_pai_id",
          "tipo": "int?",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "nome",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao_tecnica",
          "tipo": "text?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao_cliente",
          "tipo": "text?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "documentacao",
          "tipo": "text?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "horas_estimadas",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "is_estrutural",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "previsao_fim_data",
          "tipo": "date?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_demanda_status_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_demanda_status"
        }
      ],
      "x": 420,
      "y": 320
    },
    {
      "nome": "demanda_conexao",
      "grupo": "dom",
      "largura": 230,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "demanda_origem_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "demanda_destino_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "eh_bidirecional",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 40,
      "y": 340
    },
    {
      "nome": "demanda_tag",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "demanda_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "tag_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tag"
        }
      ],
      "x": 420,
      "y": 640
    },
    {
      "nome": "demanda_usuario",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "demanda_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "demanda"
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        }
      ],
      "x": 40,
      "y": 540
    },
    {
      "nome": "dia_nao_util",
      "grupo": "cal",
      "largura": 310,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "dia_data",
          "tipo": "date",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "recorrente",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_dia_nao_util_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_dia_nao_util"
        },
        {
          "nome": "tipo_dia_nao_util_duracao_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_dia_nao_util_duracao"
        }
      ],
      "x": 40,
      "y": 1000
    },
    {
      "nome": "execucao",
      "grupo": "dom",
      "largura": 220,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "atividade_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "atividade"
        },
        {
          "nome": "descricao",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "inicio_data",
          "tipo": "timestamptz",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "fim_data",
          "tipo": "timestamptz?",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 800,
      "y": 60
    },
    {
      "nome": "mensagem_direta",
      "grupo": "chat",
      "largura": 220,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "mensagem_id",
          "tipo": "uuid",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "conversa_id",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_menor_id",
          "tipo": "int",
          "marca": "lg",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "usuario_maior_id",
          "tipo": "int",
          "marca": "lg",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "autor_usuario_id",
          "tipo": "int?",
          "marca": "lg",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "autor",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "texto",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "contem_codigo",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "mencoes",
          "tipo": "int[]",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "referencias",
          "tipo": "text[]",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1100,
      "y": 1000
    },
    {
      "nome": "mensagem_direta_leitura",
      "grupo": "chat",
      "largura": 250,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "conversa_id",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "outro_usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "lida_ate_date",
          "tipo": "timestamptz?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "silenciada",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1400,
      "y": 1000
    },
    {
      "nome": "mensagem_direta_preferencia",
      "grupo": "chat",
      "largura": 280,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "avisos_ativos",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "aviso_desktop_ativo",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "som_ativo",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "silenciado_ate_date",
          "tipo": "timestamptz?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "atalho_global",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1400,
      "y": 1180
    },
    {
      "nome": "mensagem_direta_supervisao",
      "grupo": "chat",
      "largura": 270,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "leitor_usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "conversa_id",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_menor_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "usuario_maior_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "participantes_avisados",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1790,
      "y": 1000
    },
    {
      "nome": "ponto_justificativa",
      "grupo": "usr",
      "largura": 210,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "gestor_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "dia_data",
          "tipo": "date",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "nome",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "horas_cobertas",
          "tipo": "numeric",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1420,
      "y": 60
    },
    {
      "nome": "projeto",
      "grupo": "dom",
      "largura": 290,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "nome",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "cor",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "inicio_data",
          "tipo": "date?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "previsao_fim_data",
          "tipo": "date?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_projeto_status_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_projeto_status"
        },
        {
          "nome": "volume_esperado_horas_mes",
          "tipo": "int?",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 420,
      "y": 60
    },
    {
      "nome": "prompt",
      "grupo": "ia",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_prompt_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_prompt"
        },
        {
          "nome": "versao",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "conteudo",
          "tipo": "text",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "ativo",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "rascunho",
          "tipo": "bool",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        }
      ],
      "x": 1790,
      "y": 430
    },
    {
      "nome": "proposta_ia",
      "grupo": "ia",
      "largura": 330,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "usuario"
        },
        {
          "nome": "tipo_proposta_ia_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_proposta_ia"
        },
        {
          "nome": "tipo_proposta_ia_status_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_proposta_ia_status"
        },
        {
          "nome": "dados",
          "tipo": "jsonb",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "resolucao_data",
          "tipo": "timestamptz?",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "resultado",
          "tipo": "jsonb?",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1790,
      "y": 640
    },
    {
      "nome": "tag",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "nome",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "cor",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 420,
      "y": 800
    },
    {
      "nome": "tipo_anotacao",
      "grupo": "usr",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "ordem",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1420,
      "y": 740
    },
    {
      "nome": "tipo_atividade_prioridade",
      "grupo": "dom",
      "largura": 240,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "ordem",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "cor",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1140,
      "y": 550
    },
    {
      "nome": "tipo_atividade_status",
      "grupo": "dom",
      "largura": 210,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1140,
      "y": 420
    },
    {
      "nome": "tipo_demanda_status",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 40,
      "y": 190
    },
    {
      "nome": "tipo_dia_nao_util",
      "grupo": "cal",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 420,
      "y": 1000
    },
    {
      "nome": "tipo_dia_nao_util_duracao",
      "grupo": "cal",
      "largura": 240,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 420,
      "y": 1130
    },
    {
      "nome": "tipo_projeto_status",
      "grupo": "dom",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 40,
      "y": 60
    },
    {
      "nome": "tipo_prompt",
      "grupo": "ia",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 2170,
      "y": 430
    },
    {
      "nome": "tipo_proposta_ia",
      "grupo": "ia",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 2170,
      "y": 640
    },
    {
      "nome": "tipo_proposta_ia_status",
      "grupo": "ia",
      "largura": 220,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 2170,
      "y": 770
    },
    {
      "nome": "tipo_provedor_ia",
      "grupo": "ia",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 2170,
      "y": 60
    },
    {
      "nome": "tipo_usuario",
      "grupo": "usr",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1140,
      "y": 60
    },
    {
      "nome": "tipo_usuario_status",
      "grupo": "usr",
      "largura": 200,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "codigo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "descricao",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        }
      ],
      "x": 1140,
      "y": 190
    },
    {
      "nome": "usuario",
      "grupo": "usr",
      "largura": 290,
      "colunas": [
        {
          "nome": "id",
          "tipo": "serial",
          "marca": "pk",
          "tabelaReferenciada": null
        },
        {
          "nome": "login",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "senha_encriptada",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "nome_completo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "cargo_titulo",
          "tipo": "varchar",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "horas_diarias_necessarias",
          "tipo": "int",
          "marca": "",
          "tabelaReferenciada": null
        },
        {
          "nome": "tipo_usuario_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_usuario"
        },
        {
          "nome": "tipo_usuario_status_id",
          "tipo": "int",
          "marca": "fk",
          "tabelaReferenciada": "tipo_usuario_status"
        }
      ],
      "x": 1420,
      "y": 320
    }
  ]
};
