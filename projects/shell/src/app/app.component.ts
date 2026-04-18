import { NgComponentOutlet } from '@angular/common';
import { Component, OnDestroy, Type, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

import { ShellAuthService } from './shell-auth.service';

type CoreDescriptionMetadata = {
  descNumber: number;
  coreNumber: number;
  topDepth: number;
  bottomDepth: number;
  reservoir: string;
  coreDesc: string;
};

type WidgetId = 'coreviewer' | 'dataviewer';

@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  private readonly authService = inject(ShellAuthService);

  readonly authenticated = this.authService.authenticated;
  readonly authenticatedException = this.authService.authenticatedException;
  readonly currentUser = this.authService.currentUser;

  readonly coreViewerComponent = signal<Type<unknown> | null>(null);
  readonly dataViewerComponent = signal<Type<unknown> | null>(null);
  readonly coreViewerError = signal('');
  readonly dataViewerError = signal('');
  readonly selectedDescription = signal<CoreDescriptionMetadata | null>(null);
  readonly maximizedWidget = signal<WidgetId | null>(null);
  readonly coreViewerInputs = computed(() => ({
    selectedDescription: this.selectedDescription()
  }));

  private widgetsLoaded = false;
  private readonly handleDescriptionSelected = (event: Event): void => {
    const selectedDescription = (event as CustomEvent<CoreDescriptionMetadata>).detail;

    if (selectedDescription?.descNumber) {
      this.selectedDescription.set(selectedDescription);
    }
  };

  constructor() {
    window.addEventListener('coral:description-selected', this.handleDescriptionSelected);

    effect(() => {
      if (this.authenticated() && !this.widgetsLoaded) {
        this.widgetsLoaded = true;
        void this.loadWidgets();
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('coral:description-selected', this.handleDescriptionSelected);
  }

  toggleMaximize(widgetId: WidgetId): void {
    this.maximizedWidget.update((currentWidget) => (currentWidget === widgetId ? null : widgetId));
  }

  private async loadWidgets(): Promise<void> {
    await Promise.all([
      this.loadWidget('coreviewer', this.coreViewerComponent, this.coreViewerError),
      this.loadWidget('dataviewer', this.dataViewerComponent, this.dataViewerError)
    ]);
  }

  private async loadWidget(
    remoteName: string,
    component: WritableSignal<Type<unknown> | null>,
    error: WritableSignal<string>
  ): Promise<void> {
    try {
      const remote = await loadRemoteModule(remoteName, './Component');
      component.set(remote.AppComponent);
    } catch {
      error.set(`Unable to load ${remoteName}. Confirm the remote is running and listed in federation.manifest.json.`);
    }
  }
}
