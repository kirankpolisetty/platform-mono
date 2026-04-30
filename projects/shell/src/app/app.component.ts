import { NgComponentOutlet } from '@angular/common';
import { Component, OnDestroy, Type, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { Subscription } from 'rxjs';

import { ShellAuthService } from './shell-auth.service';

type CoreDescriptionMetadata = {
  descNumber: number;
  coreNumber: number;
  topDepth: number;
  bottomDepth: number;
  reservoir: string;
  coreDesc: string;
};

type WidgetId = 'coreviewer' | 'dataviewer' | 'gis';
type CoreViewerTab = 'summary' | 'viewer';

type ShellNavigationEvent = {
  route: unknown[];
};

type ArcGisSelection = {
  descNumber: number;
  wellName: string;
  wellType: 'Oil' | 'Gas';
  fieldName: string;
  latitude: number;
  longitude: number;
  reservoir: string;
  coreDesc: string;
  status: 'Active' | 'Planned';
};

type ArcGisPolygon = {
  fieldName: string;
  wellType: 'Oil' | 'Gas';
  rings: number[][][];
};

const CORE_DESCRIPTION_BY_ID = new Map<number, CoreDescriptionMetadata>([
  [
    59664,
    {
      descNumber: 59664,
      coreNumber: 1,
      topDepth: 14310,
      bottomDepth: 14346,
      reservoir: 'UNZA',
      coreDesc: 'Anzi'
    }
  ],
  [
    63774,
    {
      descNumber: 63774,
      coreNumber: 1,
      topDepth: 14310,
      bottomDepth: 14376,
      reservoir: 'UNZA',
      coreDesc: 'Garner'
    }
  ],
  [
    59667,
    {
      descNumber: 59667,
      coreNumber: 1,
      topDepth: 14310,
      bottomDepth: 14376,
      reservoir: 'UNZA',
      coreDesc: 'Garner'
    }
  ]
]);

const GIS_WELL_BY_ID = new Map<number, Omit<ArcGisSelection, 'descNumber' | 'reservoir' | 'coreDesc'>>([
  [
    59664,
    {
      wellName: 'KSA-OIL-001',
      wellType: 'Oil',
      fieldName: 'Ghawar Area',
      latitude: 25.116,
      longitude: 49.621,
      status: 'Active'
    }
  ],
  [
    63774,
    {
      wellName: 'KSA-GAS-002',
      wellType: 'Gas',
      fieldName: 'Hawiyah Area',
      latitude: 24.104,
      longitude: 49.312,
      status: 'Active'
    }
  ],
  [
    59667,
    {
      wellName: 'KSA-OIL-003',
      wellType: 'Oil',
      fieldName: 'Shaybah Area',
      latitude: 22.534,
      longitude: 53.982,
      status: 'Planned'
    }
  ]
]);

const GIS_FIELD_POLYGONS: ArcGisPolygon[] = [
  {
    fieldName: 'Ghawar Area',
    wellType: 'Oil',
    rings: [
      [
        [49.42, 25.28],
        [49.79, 25.28],
        [49.86, 25.02],
        [49.56, 24.88],
        [49.31, 25.02],
        [49.42, 25.28]
      ]
    ]
  },
  {
    fieldName: 'Hawiyah Area',
    wellType: 'Gas',
    rings: [
      [
        [49.08, 24.28],
        [49.42, 24.28],
        [49.49, 23.98],
        [49.18, 23.86],
        [48.98, 24.04],
        [49.08, 24.28]
      ]
    ]
  },
  {
    fieldName: 'Shaybah Area',
    wellType: 'Oil',
    rings: [
      [
        [53.66, 22.71],
        [54.15, 22.71],
        [54.25, 22.41],
        [53.89, 22.22],
        [53.55, 22.39],
        [53.66, 22.71]
      ]
    ]
  }
];

@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  private readonly authService = inject(ShellAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly authenticated = this.authService.authenticated;
  readonly authenticatedException = this.authService.authenticatedException;
  readonly currentUser = this.authService.currentUser;

  readonly coreViewerComponent = signal<Type<unknown> | null>(null);
  readonly dataViewerComponent = signal<Type<unknown> | null>(null);
  readonly gisViewerComponent = signal<Type<unknown> | null>(null);
  readonly coreViewerError = signal('');
  readonly dataViewerError = signal('');
  readonly gisViewerError = signal('');
  readonly selectedDescription = signal<CoreDescriptionMetadata | null>(null);
  readonly maximizedWidget = signal<WidgetId | null>(null);
  readonly activeCoreTab = signal<CoreViewerTab>('summary');
  readonly coreViewerInputs = computed(() => ({
    selectedDescription: this.selectedDescription(),
    activeCoreTab: this.activeCoreTab()
  }));
  readonly dataViewerInputs = computed(() => ({
    selectedDescNumber: this.selectedDescription()?.descNumber ?? null
  }));
  readonly gisViewerInputs = computed(() => {
    const description = this.selectedDescription();

    if (!description) {
      return { selectedWell: null };
    }

    const gisWell = GIS_WELL_BY_ID.get(description.descNumber);

    return {
      polygons: GIS_FIELD_POLYGONS,
      selectedWell: gisWell
        ? {
            ...gisWell,
            descNumber: description.descNumber,
            reservoir: description.reservoir,
            coreDesc: description.coreDesc
          }
        : null
    };
  });

  private widgetsLoaded = false;
  private readonly routerEventsSubscription: Subscription;
  private readonly handleDescriptionSelected = (event: Event): void => {
    const selectedDescription = (event as CustomEvent<CoreDescriptionMetadata>).detail;

    if (selectedDescription?.descNumber) {
      this.setSelectedDescription(selectedDescription);
    }
  };
  private readonly handleDescriptionCleared = (): void => {
    this.clearSelectedDescription();
  };
  private readonly handleShellNavigation = (event: Event): void => {
    const navigation = (event as CustomEvent<ShellNavigationEvent>).detail;

    if (Array.isArray(navigation?.route)) {
      void this.router.navigate(navigation.route);
    }
  };

  constructor() {
    window.addEventListener('coral:description-selected', this.handleDescriptionSelected);
    window.addEventListener('coral:description-cleared', this.handleDescriptionCleared);
    window.addEventListener('coral:navigate', this.handleShellNavigation);
    this.syncRouteStateFromUrl();

    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncRouteStateFromUrl();
      }
    });

    effect(() => {
      if (this.authenticated() && !this.widgetsLoaded) {
        this.widgetsLoaded = true;
        void this.loadWidgets();
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('coral:description-selected', this.handleDescriptionSelected);
    window.removeEventListener('coral:description-cleared', this.handleDescriptionCleared);
    window.removeEventListener('coral:navigate', this.handleShellNavigation);
    this.routerEventsSubscription.unsubscribe();
  }

  toggleMaximize(widgetId: WidgetId): void {
    this.maximizedWidget.update((currentWidget) => (currentWidget === widgetId ? null : widgetId));
  }

  private setSelectedDescription(selectedDescription: CoreDescriptionMetadata): void {
    this.selectedDescription.set(selectedDescription);
    this.pushSelectedDescriptionUrl(selectedDescription.descNumber);
  }

  private clearSelectedDescription(): void {
    this.selectedDescription.set(null);
    this.activeCoreTab.set('summary');
    void this.router.navigate(['/']);
  }

  private syncRouteStateFromUrl(): void {
    const routeState = this.getCoreDescriptionRouteState();

    if (!routeState) {
      this.selectedDescription.set(null);
      this.activeCoreTab.set('summary');
      return;
    }

    const selectedDescription = CORE_DESCRIPTION_BY_ID.get(routeState.descNumber);

    if (selectedDescription) {
      this.selectedDescription.set(selectedDescription);
    }

    this.activeCoreTab.set(routeState.coreTab);
  }

  private getCoreDescriptionRouteState(): { descNumber: number; coreTab: CoreViewerTab } | null {
    let currentRoute = this.route;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const descNumberParam = currentRoute.snapshot.paramMap.get('descNumber');
    const coreTabParam = currentRoute.snapshot.paramMap.get('coreTab');

    if (!descNumberParam) {
      return null;
    }

    return {
      descNumber: Number(descNumberParam),
      coreTab: coreTabParam === 'viewer' ? 'viewer' : 'summary'
    };
  }

  private pushSelectedDescriptionUrl(descNumber: number): void {
    void this.router.navigate(['/coredescription', descNumber, this.activeCoreTab()]);
  }

  private async loadWidgets(): Promise<void> {
    await Promise.all([
      this.loadWidget('coreviewer', this.coreViewerComponent, this.coreViewerError),
      this.loadWidget('dataviewer', this.dataViewerComponent, this.dataViewerError),
      this.loadWidget('arcgisviewer', this.gisViewerComponent, this.gisViewerError)
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
