import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { ShellAuthService } from './shell-auth.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the shell headline', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Shell host with two microfrontends');
  });

  it('should save the jwt token through the auth service', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const authService = TestBed.inject(ShellAuthService);

    app.tokenDraft = 'header.payload.signature';
    app.saveToken();

    expect(authService.token()).toBe('header.payload.signature');
    expect(localStorage.getItem('shell.jwt.token')).toBe('header.payload.signature');
  });

  it('should clear the jwt token', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const authService = TestBed.inject(ShellAuthService);

    authService.setToken('header.payload.signature');
    app.clearToken();

    expect(authService.token()).toBe('');
    expect(localStorage.getItem('shell.jwt.token')).toBeNull();
  });
});
