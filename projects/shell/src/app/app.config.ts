import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { jwtAuthInterceptor } from './jwt-auth.interceptor';
import { ShellAuthService } from './shell-auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtAuthInterceptor])),
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    JwtHelperService,
    provideAppInitializer(() => {
      const authService = inject(ShellAuthService);
      return authService.initialize();
    })
  ]
};
