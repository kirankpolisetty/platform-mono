import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ShellAuthService } from './shell-auth.service';

export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(ShellAuthService);
  const token = authService.token();

  if (!token || req.headers.has('Authorization') || req.url.endsWith('/remoteEntry.json')) {
    return next(req).pipe(
      catchError((error: unknown) => {
        handleUnauthorizedResponse(error, authService);
        return throwError(() => error);
      })
    );
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  ).pipe(
    catchError((error: unknown) => {
      handleUnauthorizedResponse(error, authService);
      return throwError(() => error);
    })
  );
};

function handleUnauthorizedResponse(error: unknown, authService: ShellAuthService): void {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    authService.markUnauthorized('invalid login');
  }
}
