import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';

/**
 * Deep-link `/usuario/:id/anotacoes` (task 114): só redireciona para onde o drawer vive.
 * Gestor → listagem; o próprio usuário → Ponto; id alheio de quem não é gestor → Ponto, sem drawer.
 */
@Component({
  selector: 'app-usuario-anotacoes',
  standalone: true,
  template: '',
})
export class UsuarioAnotacoesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sessao = inject(UsuarioSessaoService);

  ngOnInit(): void {
    const usuarioId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.sessao.eGestor()) {
      this.router.navigate(['/usuario'], { queryParams: { anotacoes: usuarioId }, replaceUrl: true });
    } else if (usuarioId === this.sessao.id()) {
      this.router.navigate(['/ponto'], { queryParams: { anotacoes: usuarioId }, replaceUrl: true });
    } else {
      this.router.navigate(['/ponto'], { replaceUrl: true });
    }
  }
}
