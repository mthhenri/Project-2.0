import { Component } from '@angular/core';

/**
 * O aviso acima do texto do cliente para quem só lê (o desenvolvedor, task 254): o pedido do cliente é lido por todos e só gestor e
 * administrador o alteram. Usado na demanda aberta do chat e no documento do plano.
 */
@Component({
  selector: 'app-aviso-pedido-do-cliente',
  standalone: true,
  templateUrl: './aviso-pedido-do-cliente.component.html',
  styleUrl: './aviso-pedido-do-cliente.component.scss',
})
export class AvisoPedidoDoClienteComponent {}
