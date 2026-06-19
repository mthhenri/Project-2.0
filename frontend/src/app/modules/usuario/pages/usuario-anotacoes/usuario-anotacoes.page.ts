import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-usuario-anotacoes',
  standalone: true,
  imports: [],
  template: '',
})
export class UsuarioAnotacoesPage implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/usuario'], { replaceUrl: true });
  }
}
