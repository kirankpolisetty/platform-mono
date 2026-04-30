import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    children: []
  },
  {
    path: 'coredescription/:descNumber',
    children: []
  },
  {
    path: 'coredescription/:descNumber/:coreTab',
    children: []
  },
  {
    path: 'coreviewer',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'dataviewer',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'data-viewer',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
