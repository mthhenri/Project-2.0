# 336-checkin-situacao-em-sinal-unico.spec.md

> Task 8/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-009, A-010 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-03.
> Severidade: Baixa. Área: frontend/checkin.

## Objetivo

Janelinha, página embutida e "Próximo check-in" do menu do perfil leem a mesma situação guardada no `CheckinService`, sem repetir a consulta nem mostrar horário velho.

## Contexto

**A-009 · Baixa · 'Próximo check-in' do menu do perfil fica montado a sessão inteira e não reconsulta ao abrir: mostra horário velho depois de suspender ou retomar**

O comentário do componente diz que o popover só monta o conteúdo aberto e que reabrir consulta de novo. Não é o que acontece: o conteúdo é projetado e nasce junto com a topbar. O componente consulta uma vez na carga e só refaz quando o id da execução ativa muda. Suspender ou retomar os check-ins (proposta SUSPENDER_CHECKIN) não muda a execução, então o menu segue contando para o horário antigo e depois fica em 'Check-in agora'. O relógio de 1 s também corre a sessão inteira com o menu fechado. Janelinha, menu e página guardam cada um a sua cópia da situação.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/checkin/components/checkin-proximo/checkin-proximo.component.ts:8-9 — comentário: 'o popover só monta o conteúdo aberto ... reabrir consulta de novo'
- frontend/src/app/shared/layout/topbar/topbar.component.html:96-107 — <app-checkin-proximo /> é conteúdo projetado de <p-popover>, sem ng-template nem (onShow)
- node_modules/primeng/fesm2022/primeng-popover.mjs:407 e 426 — o popover só esconde o <ng-content> atrás de @if (render); o conteúdo projetado é criado pelo componente pai
- docs/specs/backlog/auditoria-requisicoes-telas/verificacao-320-325.md:33 — 'O checkin-proximo (menu do perfil) vive montado desde o carregamento'
- frontend/src/app/modules/checkin/components/checkin-proximo/checkin-proximo.component.ts:31 — setInterval de 1 s no construtor
- frontend/src/app/modules/checkin/components/checkin-proximo/checkin-proximo.component.ts:35-44 — só reconsulta se o id da execução ativa mudar e divergir
- backend/src/modules/checkin/executores/suspender-checkin.executor.ts:24-33 — suspender e retomar não tocam a execução
- frontend/src/app/modules/checkin/utils/checkin.util.ts:48-58 — sem nova situação, o texto passa a 'Check-in agora' quando o horário antigo vence

Como observar: Com execução ativa, pedir no chat 'vou entrar numa reunião', confirmar a proposta e abrir o menu do perfil: continua 'Próximo check-in em mm:ss' em vez de 'Check-ins suspensos'; passado o horário antigo, mostra 'Check-in agora'. Depende de IA no ar; não executei.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-010 · Baixa · Janelinha recebe a situação 'disparado' e a página embutida pede GET /checkin/situacao de novo; ao fechar, a janelinha pede outra vez**

A janelinha só monta a página do check-in depois de receber a situação com disparado: true. A página, ao nascer, pede a mesma situação (a consulta anterior já terminou, então não é compartilhada) e pode pedir também /ia/disponibilidade. Quando a página se encerra, ela já tem a situação nova (acabou de conferir), mas só avisa 'encerrado' e a janelinha consulta de novo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.ts:79-88 — conferir() guarda a situação que torna visivel() verdadeiro
- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.html:10-12 — <app-checkin-page [embutido]="true"> sem receber a situação
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:183-191 — ngOnInit chama iaDisponibilidade.carregar() e consultarSituacao()
- frontend/src/app/modules/checkin/services/checkin.service.ts:14 e 20 — só a consulta em curso é compartilhada; resposta concluída não é reaproveitada
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:296-300 e frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.ts:74-77 — fechar() emite encerrado sem dados e aoEncerrar() chama conferir()

Como observar: No instante em que o diálogo do check-in aparece, a aba de rede mostra dois GET /checkin/situacao em sequência (o da janelinha e o da página). Ao sumir o diálogo, mais um logo depois do último tique de 3 s.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `CheckinService` guarda a última situação num sinal, atualizado por qualquer consulta.
2. A página embutida na janelinha recebe a situação que a janelinha já tem (só consulta sozinha na rota `/checkin`) e devolve a última ao encerrar.
3. "Próximo check-in" lê o sinal; suspender ou retomar os check-ins atualiza o texto do menu sem recarregar a página.
4. Testes dos três componentes para o estado compartilhado.

## Critérios de Aceite

- Ao vivo: abrir o diálogo pelo disparo faz 1 `GET /checkin/situacao` (hoje 2) e fechar não pede de novo; depois de suspender, o menu do perfil mostra a suspensão.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

