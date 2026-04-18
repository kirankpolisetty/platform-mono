import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { DecodedToken, UserProfile } from './auth.models';

const TOKEN_SERVICE_URL = 'https://token-dev.enp.kuwait.com.sa/token/apps/OINS';
const LOCAL_DEV_FALLBACK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cG4iOiJLaXJhbiIsImdyb3VwcyI6WyJERVYiLCJPSU5TIl0sImxhc3RfbG9naW4iOjE3MTI2MjA4MDB9.dev-signature';
export const SHELL_JWT_STORAGE_KEY = 'shell.jwt.token';
export const SHELL_JWT_EVENT_NAME = 'shell-jwt-token-changed';

@Injectable({ providedIn: 'root' })
export class ShellAuthService {
  private readonly http = inject(HttpClient);
  private readonly jwtHelper = inject(JwtHelperService);

  readonly token = signal<string>(this.readToken());
  readonly authenticated = signal<boolean>(false);
  readonly authenticatedException = signal<string>('');
  readonly userProfile = signal<UserProfile | null>(this.readUserProfile(this.token()));
  readonly currentUser = computed(() => this.userProfile()?.username ?? '');

  async initialize(): Promise<boolean> {
    const existingToken = this.token();
    const tokenExpired = !existingToken || this.jwtHelper.isTokenExpired(existingToken);

    if (!tokenExpired && existingToken) {
      const userProfile = this.toUserProfile(existingToken);
      this.userProfile.set(userProfile);
      this.authenticated.set(true);
      this.authenticatedException.set('');
      this.broadcastToken(existingToken);
      return true;
    }

    try {
      const userProfile = await firstValueFrom(this.getToken());
      this.userProfile.set(userProfile);
      this.authenticated.set(true);
      this.authenticatedException.set('');
      return true;
    } catch (error) {
      console.error('Shell token validation failed', error);
      return this.useLocalFallbackTokenIfAllowed();
    }
  }

  getToken() {
    return this.http
      .get(TOKEN_SERVICE_URL, {
        responseType: 'text',
        withCredentials: true
      })
      .pipe(
        map((rawToken) => {
          const token = normalizeToken(rawToken);

          if (!token) {
            throw new Error('Token service returned no usable JWT');
          }

          this.setToken(token);
          return this.toUserProfile(token);
        })
      );
  }

  setToken(token: string): void {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      this.clearToken();
      return;
    }

    sessionStorage.setItem(SHELL_JWT_STORAGE_KEY, normalizedToken);
    this.token.set(normalizedToken);
    this.userProfile.set(this.toUserProfile(normalizedToken));
    this.broadcastToken(normalizedToken);
  }

  clearToken(): void {
    sessionStorage.removeItem(SHELL_JWT_STORAGE_KEY);
    this.token.set('');
    this.userProfile.set(null);
    this.broadcastToken('');
  }

  markUnauthorized(message = 'invalid login'): void {
    this.clearToken();
    this.authenticated.set(false);
    this.authenticatedException.set(message);
  }

  private readToken(): string {
    return sessionStorage.getItem(SHELL_JWT_STORAGE_KEY)?.trim() ?? '';
  }

  private readUserProfile(token: string): UserProfile | null {
    return token ? this.toUserProfile(token) : null;
  }

  private toUserProfile(token: string): UserProfile {
    const decodedToken = this.jwtHelper.decodeToken<DecodedToken>(token);

    return {
      username: decodedToken?.upn?.trim() || 'Unknown',
      userRoles: decodedToken?.groups ?? [],
      lastLogin: decodedToken?.last_login ? new Date(decodedToken.last_login) : null
    };
  }

  private broadcastToken(token: string): void {
    window.dispatchEvent(
      new CustomEvent(SHELL_JWT_EVENT_NAME, {
        detail: { token }
      })
    );
  }

  private useLocalFallbackTokenIfAllowed(): boolean {
    if (!isLocalDevelopmentHost()) {
      this.clearToken();
      this.authenticated.set(false);
      this.authenticatedException.set('invalid login');
      return false;
    }

    console.warn('Using local development fallback JWT for shell startup');
    this.setToken(LOCAL_DEV_FALLBACK_JWT);
    this.authenticated.set(true);
    this.authenticatedException.set('');
    return true;
  }
}

function normalizeToken(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const bearerMatch = /^Bearer\s+(.+)$/i.exec(trimmedValue);
  const token = bearerMatch?.[1]?.trim() ?? trimmedValue;

  return token.split('.').length === 3 ? token : '';
}

function isLocalDevelopmentHost(): boolean {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}
