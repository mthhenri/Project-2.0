# 28 — Frontend Execucao

**Depende de:** 27
**Entrega:** timer de execução e histórico

---

## Arquivos a Criar

```
frontend/src/app/modules/execucao/
  execucao.routes.ts
  pages/
    execucao-ativa/
      execucao-ativa.page.ts
      execucao-ativa.page.html
    execucao-historico/
      execucao-historico.page.ts
      execucao-historico.page.html
  components/
    execucao-timer/
      execucao-timer.component.ts
      execucao-timer.component.html
  services/
    execucao.service.ts
  models/
    execucao.model.ts
```

---

## execucao.service.ts

```typescript
iniciar(dto: ExecucaoIniciarDto): Observable<...>
encerrar(id: number, dto: ExecucaoEncerrarDto): Observable<...>
listar(filtros: ExecucaoListarDto): Observable<...>
recuperar(id: number): Observable<...>
alterar(id: number, dto: ExecucaoAlterarDto): Observable<...>
buscarAtiva(): Observable<StandardResponse<ExecucaoIniciadaDto | null>>
```

`buscarAtiva` chama `GET /api/v1/execucao?ativa=true` — adicionar suporte
a esse filtro na listagem do backend se necessário, ou criar endpoint dedicado.

---

## Telas

### execucao-ativa

Página principal de execução. Exibida na sidebar como item de acesso rápido.

Na entrada da página, verificar se existe execução ativa via `buscarAtiva()`:
- **Se existe:** exibir `execucao-timer` com o timer em andamento
- **Se não existe:** exibir formulário para iniciar nova execução

**Iniciar nova execução:**
- Autocomplete de atividades (busca por nome, filtra por demandas do usuário)
- Campo descrição com `AssistenteDescricaoComponent`
- Botão "Iniciar"

**Com execução ativa:**
- Componente `execucao-timer` mostrando tempo decorrido
- Campo descrição editável (salva ao encerrar)
- Nome da atividade e demanda (links)
- Botão "Encerrar"

### execucao-timer (componente)

Timer que conta o tempo desde `inicioData` usando `setInterval` a cada segundo.
Exibe no formato `HH:mm:ss`. Atualiza via signal interno `tempoDecorrido`.

```typescript
export class ExecucaoTimerComponent implements OnInit, OnDestroy {
  @Input() inicioData!: Date;

  tempoDecorrido = signal<string>('00:00:00');
  private intervalo?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.intervalo = setInterval(() => {
      const agora = new Date();
      const segundos = Math.floor((agora.getTime() - new Date(this.inicioData).getTime()) / 1000);
      const horas = Math.floor(segundos / 3600);
      const minutos = Math.floor((segundos % 3600) / 60);
      const segs = segundos % 60;
      this.tempoDecorrido.set(
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`,
      );
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalo);
  }
}
```

### execucao-historico

- Tabela com colunas: atividade (link), data, início, fim, duração (usando pipe `minutos-para-horas`), descrição (truncada)
- Filtros: data (date picker), atividade
- Gestores podem filtrar por usuário
- Paginação server-side
- Clique na linha → dialog de edição de descrição (gestores)

---

## NÃO implementar nesta task

- Exportação do histórico
- Relatório de horas (task 27)
- Notificação de tempo máximo atingido
