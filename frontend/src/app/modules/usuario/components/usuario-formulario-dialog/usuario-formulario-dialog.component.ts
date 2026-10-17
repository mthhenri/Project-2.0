import { Component, inject, signal, computed, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { UsuarioCriarDto, UsuarioAlterarDto, UsuarioRecuperadoDto, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { gerarSenha, sugerirLogin } from '../../utils/usuario-credenciais.util';

/**
 * Criar e editar usuário no mesmo dialog (task 113). Criar: nome + cargo + Enter — o login
 * acompanha o nome até ser editado à mão e a senha já nasce gerada. Editar: sem login nem
 * senha, com Status; o Tipo só muda para gestor editando outra pessoa.
 */
@Component({
  selector: 'app-usuario-formulario-dialog',
  standalone: true,
  imports: [DialogFormularioDirective, DialogDicaAtalhosComponent, ReactiveFormsModule, ButtonModule, InputTextModule, SelectButtonModule, ToggleSwitchModule, InputNumberModule, TooltipModule, DialogModule],
  templateUrl: './usuario-formulario-dialog.component.html',
  styleUrl: './usuario-formulario-dialog.component.scss',
})
export class UsuarioFormularioDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emitido quando um usuário é criado, para a listagem recarregar. */
  readonly aoCriar = output<void>();
  /** Emitido quando um usuário é alterado, para a listagem recarregar. */
  readonly aoAlterar = output<void>();

  readonly formulario = this.formBuilder.nonNullable.group({
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    cargoTitulo: ['', [Validators.required]],
    login: ['', [Validators.required, Validators.minLength(4)]],
    senhaNaoEncriptada: ['', [Validators.required, Validators.minLength(8)]],
    tipo: [TipoUsuarioEnum.DESENVOLVEDOR as TipoUsuarioEnum, [Validators.required]],
    horasDiariasNecessarias: [8, [Validators.required]],
    ativo: [true],
  });

  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);
  /** Perfil em edição; `null` = criando. */
  readonly usuarioEmEdicao = signal<UsuarioRecuperadoDto | null>(null);
  readonly carregandoUsuario = signal<boolean>(false);
  readonly senhaCopiada = signal<boolean>(false);
  readonly editando = computed(() => this.usuarioEmEdicao() !== null || this.carregandoUsuario());
  private loginEditadoAMao = false;

  /** O tipo só muda por gestor, nunca no próprio perfil. */
  readonly podeEditarTipo = computed(() => {
    const usuarioEditado = this.usuarioEmEdicao();
    return !usuarioEditado || (this.sessao.eGestor() && this.sessao.usuarioAtual()?.id !== usuarioEditado.id);
  });
  readonly podeEditarStatus = computed(() => this.sessao.eGestor() && this.sessao.usuarioAtual()?.id !== this.usuarioEmEdicao()?.id);

  /** Só o administrador cria ou promove administradores; ao editar um, a opção aparece para mostrar o valor atual. */
  readonly tiposOpcoes = computed(() => {
    const opcoes = [
      { label: 'Desenvolvedor', value: TipoUsuarioEnum.DESENVOLVEDOR },
      { label: 'Gestor', value: TipoUsuarioEnum.GESTOR },
    ];
    if (this.sessao.eAdministrador() || this.usuarioEmEdicao()?.tipo === TipoUsuarioEnum.ADMINISTRADOR) {
      opcoes.push({ label: 'Administrador', value: TipoUsuarioEnum.ADMINISTRADOR });
    }
    return opcoes;
  });

  constructor() {
    this.formulario.controls.nomeCompleto.valueChanges.pipe(takeUntilDestroyed()).subscribe((nome) => {
      if (!this.editando() && !this.loginEditadoAMao) {
        this.formulario.controls.login.setValue(sugerirLogin(nome ?? ''), { emitEvent: false });
      }
    });
  }

  /** Abre o dialog para criar: formulário limpo, senha gerada. */
  abrir(): void {
    this.usuarioEmEdicao.set(null);
    this.carregandoUsuario.set(false);
    this.loginEditadoAMao = false;
    this.senhaCopiada.set(false);
    this.formulario.reset({ tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8, ativo: true });
    this.alternarObrigatoriedadeCriacao(true);
    this.gerarNovaSenha();
    this.mostrarDialog.set(true);
  }

  /** Abre o dialog para editar: busca o usuário (o resumo da listagem não traz as horas diárias). */
  abrirEdicao(usuarioId: number): void {
    this.usuarioEmEdicao.set(null);
    this.carregandoUsuario.set(true);
    this.formulario.reset({ tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8, ativo: true });
    this.alternarObrigatoriedadeCriacao(false);
    this.mostrarDialog.set(true);

    this.usuarioService
      .recuperar(usuarioId)
      .pipe(finalize(() => this.carregandoUsuario.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso || !resposta.dados) return;
          const usuario = resposta.dados;
          this.usuarioEmEdicao.set(usuario);
          this.formulario.patchValue({
            nomeCompleto: usuario.nomeCompleto,
            cargoTitulo: usuario.cargoTitulo,
            horasDiariasNecessarias: usuario.horasDiariasNecessarias,
            tipo: usuario.tipo,
            ativo: usuario.status === TipoUsuarioStatusEnum.ATIVO,
          });
        },
        error: () => this.mostrarDialog.set(false),
      });
  }

  aoEditarLogin(): void {
    this.loginEditadoAMao = true;
  }

  gerarNovaSenha(): void {
    this.senhaCopiada.set(false);
    this.formulario.controls.senhaNaoEncriptada.setValue(gerarSenha());
  }

  async copiarSenha(): Promise<void> {
    const senha = this.formulario.controls.senhaNaoEncriptada.value;
    if (!senha) return;
    try {
      await navigator.clipboard.writeText(senha);
      this.senhaCopiada.set(true);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Não foi possível copiar a senha' });
    }
  }

  salvar(): void {
    if (this.carregandoUsuario()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const usuarioEditado = this.usuarioEmEdicao();
    if (usuarioEditado) this.salvarEdicao(usuarioEditado);
    else this.salvarCriacao();
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private salvarCriacao(): void {
    const { ativo, ...valores } = this.formulario.getRawValue();
    this.carregando.set(true);
    this.usuarioService
      .criar(valores as UsuarioCriarDto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Usuário criado — login ${valores.login}` });
          this.mostrarDialog.set(false);
          this.aoCriar.emit();
        },
      });
  }

  private salvarEdicao(usuarioEditado: UsuarioRecuperadoDto): void {
    const valores = this.formulario.getRawValue();
    const dto: UsuarioAlterarDto = {
      nomeCompleto: valores.nomeCompleto,
      cargoTitulo: valores.cargoTitulo,
      horasDiariasNecessarias: valores.horasDiariasNecessarias,
    };
    if (this.podeEditarStatus()) dto.status = valores.ativo ? TipoUsuarioStatusEnum.ATIVO : TipoUsuarioStatusEnum.INATIVO;
    if (this.podeEditarTipo()) dto.tipo = valores.tipo;

    this.carregando.set(true);
    this.usuarioService
      .alterar(usuarioEditado.id, dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Usuário alterado com sucesso' });
          this.mostrarDialog.set(false);
          this.aoAlterar.emit();
        },
      });
  }

  /** Login e senha só existem na criação: na edição saem da validação. */
  private alternarObrigatoriedadeCriacao(criando: boolean): void {
    for (const controle of [this.formulario.controls.login, this.formulario.controls.senhaNaoEncriptada]) {
      if (criando) controle.enable({ emitEvent: false });
      else controle.disable({ emitEvent: false });
    }
  }
}
