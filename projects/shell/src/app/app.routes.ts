import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'coreviewer'
  },
  {
    path: 'coreviewer',
    loadComponent: () => loadRemoteModule('coreviewer', './Component').then((m) => m.AppComponent),
    title: 'CoreViewer'
  },
  {
    path: 'dataviewer',
    loadComponent: () => loadRemoteModule('dataviewer', './Component').then((m) => m.AppComponent),
    title: 'DataViewer'
  },
  {
    path: '**',
    redirectTo: 'coreViewer'
  }
];
