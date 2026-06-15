# 26 — Frontend Demanda

**Depende de:** 25
**Entrega:** telas de demandas com grafo estilo Obsidian, hierarquia, tags e membros

---

## Objetivo

Telas do módulo de demandas. A visualização principal das demandas de um projeto
é um **grafo interativo estilo Obsidian** usando D3.js force simulation — nós
arrastáveis, física de repulsão, zoom e pan, cores por status. A lista hierárquica
existe como modo alternativo para gerenciamento.

---

## Dependência de Backend

Esta task exige um endpoint novo no backend (adicionar à task 10 ou criar separada):

```
GET /api/v1/demanda/grafo?projetoId=X
```

Retorna **todas** as demandas do projeto (sem paginação) com suas conexões,
formatado para o grafo:

```typescript
// DemandaGrafoDto.ts — adicionar em shared/src/dtos/demanda/
export class DemandaGrafoDto {
  nos: DemandaGrafoNoDto[];
  arestas: DemandaGrafoArestaDto[];
}

export class DemandaGrafoNoDto {
  id: number;
  nome: string;
  status: DemandaStatusEnum;
  prioridade: DemandaPrioridadeEnum;
  isEstrutural: boolean;
  horasEstimadas: number;
  demandaPaiId: number | null;
}

export class DemandaGrafoArestaDto {
  id: number;
  origemId: number;
  destinoId: number;
  tipo: 'hierarquia' | 'conexao';
  ehBidirecional: boolean;
}
```

---

## Arquivos a Criar

```
frontend/src/app/modules/demanda/
  demanda.routes.ts
  pages/
    demanda-projeto/           ← página principal: grafo do projeto
      demanda-projeto.page.ts
      demanda-projeto.page.html
      demanda-projeto.page.scss
    demanda-formulario/
      demanda-formulario.page.ts
      demanda-formulario.page.html
    demanda-detalhe/
      demanda-detalhe.page.ts
      demanda-detalhe.page.html
  components/
    demanda-grafo/             ← componente D3 force simulation
      demanda-grafo.component.ts
      demanda-grafo.component.scss
    demanda-arvore-item/       ← modo lista alternativo (recursivo)
      demanda-arvore-item.component.ts
      demanda-arvore-item.component.html
    demanda-conexao-lista/
      demanda-conexao-lista.component.ts
    demanda-membro-lista/
      demanda-membro-lista.component.ts
  services/
    demanda.service.ts
  models/
    demanda.model.ts
```

---

## demanda.service.ts

```typescript
listar(filtros: DemandaListarDto): Observable<...>
recuperarGrafo(projetoId: number): Observable<StandardResponse<DemandaGrafoDto>>
criar(dto: DemandaCriarDto): Observable<...>
recuperar(id: number): Observable<...>
alterar(id: number, dto: DemandaAlterarDto): Observable<...>
excluir(id: number): Observable<...>
recuperarArvore(id: number): Observable<...>
recuperarAncestral(id: number): Observable<...>
criarConexao(demandaId: number, dto: DemandaConexaoCriarDto): Observable<...>
listarConexoes(demandaId: number): Observable<...>
excluirConexao(demandaId: number, conexaoId: number): Observable<...>
alterarTags(demandaId: number, dto: DemandaTagsAtribuirDto): Observable<...>
listarMembros(demandaId: number): Observable<...>
atribuirMembro(demandaId: number, dto: DemandaUsuarioAtribuirDto): Observable<...>
removerMembro(demandaId: number, usuarioId: number): Observable<...>
```

---

## Telas

### demanda-projeto (tela principal)

Recebe `projetoId` como query param. É aqui que o grafo vive.

**Layout:**
- Tela quase inteira ocupada pelo componente `demanda-grafo`
- Painel lateral recolhível à direita: filtros (status, prioridade) e legenda de cores
- Botão "Nova Demanda" flutuante no canto inferior direito
- Toggle no topo: **Grafo** | **Lista** (alterna entre `demanda-grafo` e `demanda-arvore-item`)

---

### demanda-grafo (componente D3)

Componente que recebe os dados e renderiza o grafo interativo.

```typescript
@Component({
  selector: 'app-demanda-grafo',
  standalone: true,
  template: `<svg #svgContainer class="demanda-grafo__svg"></svg>`,
  styleUrls: ['./demanda-grafo.component.scss'],
})
export class DemandaGrafoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() grafo!: DemandaGrafoDto;
  @Input() filtroStatus?: DemandaStatusEnum[];

  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  private simulacao?: d3.Simulation<any, any>;
}
```

**Implementação D3 — force simulation:**

```typescript
private inicializarGrafo(): void {
  const largura = this.elementRef.nativeElement.clientWidth;
  const altura = this.elementRef.nativeElement.clientHeight;

  const svg = d3.select(this.elementRef.nativeElement.querySelector('svg'))
    .attr('width', largura)
    .attr('height', altura);

  // Zoom e pan (igual ao Obsidian)
  const grupoZoom = svg.append('g');
  svg.call(
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (evento) => grupoZoom.attr('transform', evento.transform)),
  );

  const nos = this.grafo.nos.map((no) => ({ ...no }));
  const arestas = this.grafo.arestas.map((aresta) => ({ ...aresta }));

  // Física de repulsão estilo Obsidian
  this.simulacao = d3.forceSimulation(nos)
    .force('aresta', d3.forceLink(arestas).id((no: any) => no.id).distance(120))
    .force('repulsao', d3.forceManyBody().strength(-400))
    .force('centro', d3.forceCenter(largura / 2, altura / 2))
    .force('colisao', d3.forceCollide(40));

  // Desenhar arestas
  const linhasAresta = grupoZoom.append('g')
    .selectAll('line')
    .data(arestas)
    .enter()
    .append('line')
    .attr('class', (aresta: DemandaGrafoArestaDto) =>
      aresta.tipo === 'hierarquia'
        ? 'demanda-grafo__aresta demanda-grafo__aresta--hierarquia'
        : 'demanda-grafo__aresta demanda-grafo__aresta--conexao',
    );

  // Desenhar nós (círculos)
  const gruposNo = grupoZoom.append('g')
    .selectAll('g')
    .data(nos)
    .enter()
    .append('g')
    .attr('class', 'demanda-grafo__no')
    .call(
      d3.drag<SVGGElement, any>()
        .on('start', (evento, no) => {
          if (!evento.active) this.simulacao?.alphaTarget(0.3).restart();
          no.fx = no.x;
          no.fy = no.y;
        })
        .on('drag', (evento, no) => { no.fx = evento.x; no.fy = evento.y; })
        .on('end', (evento, no) => {
          if (!evento.active) this.simulacao?.alphaTarget(0);
          no.fx = null;
          no.fy = null;
        }),
    )
    .on('click', (_evento, no) => this.router.navigate(['/demanda', no.id]));

  // Círculo do nó — tamanho varia pelo número de conexões
  gruposNo.append('circle')
    .attr('r', (no: DemandaGrafoNoDto) => this.calcularRaioNo(no))
    .attr('class', (no: DemandaGrafoNoDto) => `demanda-grafo__no-circulo demanda-grafo__no-circulo--${no.status.toLowerCase()}`);

  // Label do nó
  gruposNo.append('text')
    .attr('class', 'demanda-grafo__no-label')
    .attr('dy', '0.35em')
    .text((no: DemandaGrafoNoDto) =>
      no.nome.length > 20 ? `${no.nome.substring(0, 20)}…` : no.nome,
    );

  // Tooltip ao hover
  gruposNo.append('title').text((no: DemandaGrafoNoDto) =>
    `${no.nome}\n${no.status} • ${no.horasEstimadas}h estimadas`,
  );

  // Atualizar posições a cada tick da simulação
  this.simulacao.on('tick', () => {
    linhasAresta
      .attr('x1', (aresta: any) => aresta.source.x)
      .attr('y1', (aresta: any) => aresta.source.y)
      .attr('x2', (aresta: any) => aresta.target.x)
      .attr('y2', (aresta: any) => aresta.target.y);

    gruposNo.attr('transform', (no: any) => `translate(${no.x},${no.y})`);
  });
}

private calcularRaioNo(no: DemandaGrafoNoDto): number {
  if (no.isEstrutural) return 20;
  if (no.horasEstimadas > 40) return 16;
  if (no.horasEstimadas > 16) return 12;
  return 8;
}
```

**Estilo SCSS do grafo** (`demanda-grafo.component.scss`):

```scss
.demanda-grafo {
  &__svg {
    width: 100%;
    height: 100%;
    background-color: #0d1117; // fundo escuro estilo Obsidian
    cursor: grab;

    &:active { cursor: grabbing; }
  }

  &__aresta {
    stroke-opacity: 0.4;
    stroke-width: 1.5px;

    &--hierarquia {
      stroke: #4a9eff;  // azul para relação pai-filho
      stroke-width: 2px;
    }

    &--conexao {
      stroke: #6e7681; // cinza para conexões de grafo
      stroke-dasharray: 4 2;
    }
  }

  &__no {
    cursor: pointer;

    &-circulo {
      stroke-width: 2px;
      transition: r 0.2s ease;

      &--planejada       { fill: #4a4a6a; stroke: #7070aa; }
      &--em_desenvolvimento { fill: #1a4a7a; stroke: #4a9eff; }
      &--concluida       { fill: #1a4a2a; stroke: #4aff7a; }
    }

    &-label {
      fill: #e6edf3;
      font-size: 11px;
      text-anchor: middle;
      pointer-events: none;
      user-select: none;
    }

    &:hover &-circulo {
      stroke-width: 3px;
      filter: brightness(1.4);
    }
  }
}
```

---

### demanda-formulario

- Campos: nome, projeto (pre-selecionado via query param), demanda pai (dropdown), prioridade, status, is_estrutural (checkbox), horas estimadas, previsão fim, ordem de exibição
- Abas: Descrição Técnica, Descrição Cliente, Documentação — cada uma com textarea e `AssistenteDescricaoComponent`
- Botões: Salvar, Cancelar

---

### demanda-detalhe

Abas (`p-tabView`):
1. **Visão Geral:** dados principais, breadcrumb de ancestrais (links clicáveis)
2. **Sub-demandas:** `demanda-arvore-item` recursivo (modo lista das filhas diretas)
3. **Atividades:** lista de atividades → `/atividade`
4. **Conexões:** `demanda-conexao-lista` com direção e botão adicionar (dialog)
5. **Tags:** chips coloridos, botão editar (gestor)
6. **Membros:** `demanda-membro-lista`, botão adicionar/remover (gestor)

---

## NÃO implementar nesta task

- Modo de edição de conexões diretamente no grafo (clicar e arrastar para conectar)
- Mini-mapa de navegação (overlay no canto)
- Exportação do grafo como imagem
- Filtro de tags diretamente no grafo
