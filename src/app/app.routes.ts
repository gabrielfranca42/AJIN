import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent)
  },
  {
    path: 'post/:id',
    loadComponent: () => import('./components/view/view.component').then(m => m.ViewComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
