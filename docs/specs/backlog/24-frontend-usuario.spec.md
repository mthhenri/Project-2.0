# 22 — Frontend Usuario

**Depende de:** 21
**Entrega:** telas de gerenciamento de usuários e perfil pessoal

---

## Objetivo

Telas de usuário: listagem e criação (gestores), edição de perfil e anotações
(qualquer autenticado no próprio perfil), troca de senha.

---

## Arquivos a Criar

```
frontend/src/app/modules/usuario/
  usuario.routes.ts
  pages/
    usuario-listagem/
      usuario-listagem.page.ts
      usuario-listagem.page.html
    usuario-formulario/
      usuario-formulario.page.ts
      usuario-formulario.page.html
    usuario-perfil/
      usuario-perfil.page.ts
      usuario-perfil.page.html
    usuario-anotacoes/
      usuario-anotacoes.page.ts
      usuario-anotacoes.page.html
  components/
    usuario-cartao/
      usuario-cartao.component.ts
      usuario-cartao.component.html
  services/
    usuario.service.ts
  models/
    usuario.model.ts
```

---

## Rotas

```typescript
export const usuarioRotas: Routes = [
  { path: '',        component: UsuarioListagemPage, canActivate: [gestorGuard] },
  { path: 'novo',    component: UsuarioFormularioPage, canActivate: [gestorGuard] },
  { path: ':id',     component: UsuarioPerfilPage },
  { path: ':id/anotacoes', component: UsuarioAnotacoesPage },
];
```

---

## usuario.service.ts

Métodos que fazem chamadas HTTP ao backend.
Seguir o padrão: `Observable<StandardResponse<TipoRetorno>>`.

```typescript
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/usuario`;

  listar(filtros: UsuarioListarDto): Observable<...>
  criar(dto: UsuarioCriarDto): Observable<...>
  recuperar(id: number): Observable<...>
  atualizar(id: number, dto: UsuarioAtualizarDto): Observable<...>
  excluir(id: number): Observable<...>
  alterarSenha(id: number, dto: UsuarioSenhaAlterarDto): Observable<...>
}
```

---

## Telas

### usuario-listagem (gestores apenas)

- `p-table` com colunas: nome, login, cargo, tipo (badge colorido), status (badge)
- Filtros: tipo, status (usando `p-dropdown`)
- Botão "Novo Usuário" → `/usuario/novo`
- Ação por linha: editar, excluir (com `p-confirmDialog`)
- Paginação server-side

### usuario-formulario (gestores — criação e edição)

- Reactive Form com campos: login, senha (apenas na criação), nome completo, cargo, tipo, horas diárias
- `p-dropdown` para tipo e horas
- Botões: Salvar, Cancelar
- Em edição: campo login desabilitado

### usuario-perfil (qualquer autenticado)

- Exibe dados do usuário
- Botão "Editar" (apenas o próprio usuário ou gestor)
- Botão "Alterar senha"
- Link para "Anotações"

### usuario-anotacoes

- `p-editor` do PrimeNG para o campo `anotacoes` (HTML rico)
- Botões: Salvar, Cancelar
- Apenas o próprio usuário acessa as próprias anotações

### usuario-cartao (componente)

- Card compacto com avatar inicial, nome e cargo
- Usado em listagens de membros de demanda

---

## Troca de Senha

Ao clicar em "Alterar senha", abrir `p-dialog` com:
- Campo senha atual
- Campo nova senha (mínimo 8 chars)
- Campo confirmar nova senha (validação de igualdade no formulário)
- Botão Confirmar

---

## NÃO implementar nesta task

- Upload de foto/avatar
- Histórico de atividades do usuário
- Notificações
