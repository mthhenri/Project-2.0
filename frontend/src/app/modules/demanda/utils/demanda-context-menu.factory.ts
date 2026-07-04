import { MenuItem } from 'primeng/api';

export type CampoDescricaoDemanda = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

/** Dados mínimos de uma demanda para montar o menu de contexto (árvore ou planejamento). */
export interface DemandaMenuAlvo {
  id: number;
  isEstrutural: boolean;
  temDescricaoTecnica: boolean;
  temDescricaoCliente: boolean;
  temDocumentacao: boolean;
}

/** Callbacks disparados por cada item do menu de contexto da demanda. */
export interface DemandaMenuAcoes {
  aoVisualizar: (id: number) => void;
  aoEditar: (id: number) => void;
  aoNovaFilha: (id: number) => void;
  aoTags: (id: number) => void;
  aoMembros: (id: number) => void;
  aoDescricao: (id: number, campo: CampoDescricaoDemanda) => void;
}

/**
 * Estilo do ícone de descrição: azul da família + bold + glow quando preenchido,
 * neutro quando vazio. Padroniza com a listagem de atividades e o dialog de detalhe.
 */
function estiloIconeDescricao(tokenCor: string, preenchido: boolean): { [klass: string]: string } {
  if (!preenchido) return {};
  return {
    color: `var(${tokenCor})`,
    fontWeight: '700',
    textShadow: '0 0 4px color-mix(in srgb, currentColor 45%, transparent)',
  };
}

/**
 * Monta o menu de contexto de uma demanda, único entre a árvore (lista) e a visão de
 * Planejamento. Editar, Nova Sub-demanda, Tags e Membros são gestor-only; as descrições
 * ficam sempre disponíveis (a edição em si valida a membresia no dialog).
 */
export function construirMenuDemanda(
  alvo: DemandaMenuAlvo,
  acoes: DemandaMenuAcoes,
  eGestor: boolean,
): MenuItem[] {
  const itens: MenuItem[] = [
    {
      label: 'Visualizar',
      icon: 'pi pi-eye',
      command: () => acoes.aoVisualizar(alvo.id),
    },
  ];

  // Editar é gestor-only na árvore; o desenvolvedor edita pela dialog de detalhe,
  // onde a membresia da demanda (podeEditar) é conhecida.
  if (eGestor) {
    itens.push({
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => acoes.aoEditar(alvo.id),
    });
  }

  if (alvo.isEstrutural) {
    itens.push({
      label: 'Nova Sub-demanda',
      icon: 'pi pi-plus',
      command: () => acoes.aoNovaFilha(alvo.id),
    });
  }

  // Tags e Membros dependem de membresia (gestor-only na árvore, pelo mesmo motivo de Editar).
  if (eGestor) {
    itens.push(
      { separator: true },
      {
        label: 'Tags',
        icon: 'pi pi-tag',
        command: () => acoes.aoTags(alvo.id),
      },
      {
        label: 'Membros',
        icon: 'pi pi-users',
        command: () => acoes.aoMembros(alvo.id),
      },
    );
  }

  itens.push(
    { separator: true },
    {
      label: 'Desc. Técnica',
      icon: 'pi pi-code',
      iconStyle: estiloIconeDescricao('--app-icone-tecnica', alvo.temDescricaoTecnica),
      command: () => acoes.aoDescricao(alvo.id, 'descricaoTecnica'),
    },
    {
      label: 'Desc. Cliente',
      icon: 'pi pi-user',
      iconStyle: estiloIconeDescricao('--app-icone-cliente', alvo.temDescricaoCliente),
      command: () => acoes.aoDescricao(alvo.id, 'descricaoCliente'),
    },
    {
      label: 'Documentação',
      icon: 'pi pi-book',
      iconStyle: estiloIconeDescricao('--app-icone-doc', alvo.temDocumentacao),
      command: () => acoes.aoDescricao(alvo.id, 'documentacao'),
    },
  );

  return itens;
}
