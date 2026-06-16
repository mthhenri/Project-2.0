import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-usuario-anotacoes',
  standalone: true,
  imports: [],
  template: '',
})
export class UsuarioAnotacoesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/usuario', id], { replaceUrl: true });
  }
}
