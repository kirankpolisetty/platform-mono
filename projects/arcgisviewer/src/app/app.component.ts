import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, input, signal } from '@angular/core';
import { esriEnterpriseConfig, isConfiguredAppId } from './esri-enterprise.config';

type SelectedWell = {
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

type FieldPolygon = {
  fieldName: string;
  wellType: 'Oil' | 'Gas';
  rings: number[][][];
};

type ArcGisModules = {
  Graphic: typeof import('@arcgis/core/Graphic').default;
  Map: typeof import('@arcgis/core/Map').default;
  MapImageLayer: typeof import('@arcgis/core/layers/MapImageLayer').default;
  MapView: typeof import('@arcgis/core/views/MapView').default;
  OAuthInfo: typeof import('@arcgis/core/identity/OAuthInfo').default;
  Point: typeof import('@arcgis/core/geometry/Point').default;
  Polygon: typeof import('@arcgis/core/geometry/Polygon').default;
  SimpleFillSymbol: typeof import('@arcgis/core/symbols/SimpleFillSymbol').default;
  SimpleMarkerSymbol: typeof import('@arcgis/core/symbols/SimpleMarkerSymbol').default;
  esriConfig: typeof import('@arcgis/core/config').default;
  identityManager: typeof import('@arcgis/core/identity/IdentityManager').default;
};

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly selectedWell = input<SelectedWell | null>(null);
  readonly polygons = input<FieldPolygon[]>([]);
  readonly mapReady = signal(false);

  @ViewChild('mapHost', { static: true }) private mapHost?: ElementRef<HTMLDivElement>;

  private modules: ArcGisModules | null = null;
  private view: import('@arcgis/core/views/MapView').default | null = null;
  private enterpriseLayer: import('@arcgis/core/layers/MapImageLayer').default | null = null;
  private initialized = false;
  private lastRenderedDescNumber: number | null = null;

  constructor() {
    effect(() => {
      const selectedWell = this.selectedWell();

      if (!this.view || !this.modules) {
        return;
      }

      if (!selectedWell) {
        this.view.graphics.removeAll();
        this.renderPolygons();
        this.view.center = [46.6753, 24.7136];
        this.view.zoom = 5;
        this.lastRenderedDescNumber = null;
        return;
      }

      this.renderSelection(selectedWell, this.lastRenderedDescNumber !== selectedWell.descNumber);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.initialized || !this.mapHost) {
      return;
    }

    this.initialized = true;
    await this.initializeMap();
  }

  ngOnDestroy(): void {
    this.enterpriseLayer?.destroy();
    this.enterpriseLayer = null;
    this.view?.destroy();
    this.view = null;
  }

  private async initializeMap(): Promise<void> {
    const mapHost = this.mapHost?.nativeElement;

    if (!mapHost) {
      return;
    }

    const [
      { default: ArcgisMap },
      { default: MapImageLayer },
      { default: MapView },
      { default: Graphic },
      { default: OAuthInfo },
      { default: Point },
      { default: Polygon },
      { default: SimpleFillSymbol },
      { default: SimpleMarkerSymbol },
      { default: esriConfig },
      { default: identityManager }
    ] =
      await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/layers/MapImageLayer'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/Graphic'),
        import('@arcgis/core/identity/OAuthInfo'),
        import('@arcgis/core/geometry/Point'),
        import('@arcgis/core/geometry/Polygon'),
        import('@arcgis/core/symbols/SimpleFillSymbol'),
        import('@arcgis/core/symbols/SimpleMarkerSymbol'),
        import('@arcgis/core/config'),
        import('@arcgis/core/identity/IdentityManager')
      ]);

    this.modules = {
      Graphic,
      Map: ArcgisMap,
      MapImageLayer,
      MapView,
      OAuthInfo,
      Point,
      Polygon,
      SimpleFillSymbol,
      SimpleMarkerSymbol,
      esriConfig,
      identityManager
    };

    this.configureEnterprisePortal();

    const map = new ArcgisMap({
      basemap: 'topo-vector'
    });

    const earthLayerUrl = this.normalizeUrl(esriEnterpriseConfig.earthLayer.mapServerUrl);
    if (earthLayerUrl) {
      this.enterpriseLayer = new this.modules.MapImageLayer({
        url: earthLayerUrl,
        opacity: 0.8,
        title: 'Aramco Earth Layer'
      });
      map.add(this.enterpriseLayer);
    }

    this.view = new MapView({
      container: mapHost,
      map,
      center: [46.6753, 24.7136],
      zoom: 5,
      constraints: {
        snapToZoom: false
      }
    });

    await this.view.when();
    this.mapReady.set(true);
    this.renderPolygons();

    const selectedWell = this.selectedWell();
    if (selectedWell) {
      this.renderSelection(selectedWell, true);
    }
  }

  private renderPolygons(): void {
    if (!this.view || !this.modules) {
      return;
    }

    this.view.graphics.removeAll();

    for (const polygon of this.polygons()) {
      const geometry = new this.modules.Polygon({
        rings: polygon.rings,
        spatialReference: { wkid: 4326 }
      });

      const symbol = new this.modules.SimpleFillSymbol({
        color: polygon.wellType === 'Gas' ? [14, 165, 164, 0.18] : [245, 158, 11, 0.18],
        outline: {
          color: polygon.wellType === 'Gas' ? [45, 212, 191, 0.9] : [251, 191, 36, 0.9],
          width: 2
        }
      });

      const graphic = new this.modules.Graphic({
        geometry,
        symbol,
        attributes: {
          fieldName: polygon.fieldName,
          wellType: polygon.wellType
        },
        popupTemplate: {
          title: '{fieldName}',
          content: '{wellType} field area'
        }
      });

      this.view.graphics.add(graphic);
    }
  }

  private configureEnterprisePortal(): void {
    if (!this.modules) {
      return;
    }

    const portalUrl = this.normalizeUrl(esriEnterpriseConfig.esriUrl);
    if (!portalUrl) {
      return;
    }

    this.modules.esriConfig.portalUrl = portalUrl;

    if (!isConfiguredAppId(esriEnterpriseConfig.appId)) {
      return;
    }

    this.modules.identityManager.registerOAuthInfos([
      new this.modules.OAuthInfo({
        appId: esriEnterpriseConfig.appId,
        portalUrl,
        popup: true
      })
    ]);
  }

  private normalizeUrl(url: string): string {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return '';
    }

    if (trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://')) {
      return trimmedUrl;
    }

    if (trimmedUrl.startsWith('https:/')) {
      return trimmedUrl.replace('https:/', 'https://');
    }

    if (trimmedUrl.startsWith('http:/')) {
      return trimmedUrl.replace('http:/', 'http://');
    }

    return trimmedUrl;
  }

  private renderSelection(selectedWell: SelectedWell, shouldCenterMap: boolean): void {
    if (!this.view || !this.modules) {
      return;
    }

    this.renderPolygons();

    const point = new this.modules.Point({
      longitude: selectedWell.longitude,
      latitude: selectedWell.latitude
    });

    const symbol = new this.modules.SimpleMarkerSymbol({
      color: selectedWell.wellType === 'Gas' ? '#14b8a6' : '#f59e0b',
      outline: {
        color: '#ffffff',
        width: 1.5
      },
      size: 14
    });

    const graphic = new this.modules.Graphic({
      geometry: point,
      symbol,
      attributes: {
        title: selectedWell.wellName,
        wellType: selectedWell.wellType,
        fieldName: selectedWell.fieldName,
        reservoir: selectedWell.reservoir,
        coreDesc: selectedWell.coreDesc,
        status: selectedWell.status
      },
      popupTemplate: {
        title: '{title}',
        content: [
          {
            type: 'fields',
            fieldInfos: [
              { fieldName: 'fieldName', label: 'Field' },
              { fieldName: 'wellType', label: 'Type' },
              { fieldName: 'reservoir', label: 'Reservoir' },
              { fieldName: 'coreDesc', label: 'Core Desc' },
              { fieldName: 'status', label: 'Status' }
            ]
          }
        ]
      }
    });

    this.view.graphics.add(graphic);
    this.lastRenderedDescNumber = selectedWell.descNumber;

    if (shouldCenterMap) {
      void this.view.goTo(
        {
          center: [selectedWell.longitude, selectedWell.latitude],
          zoom: 10
        },
        {
          duration: 1000
        }
      );
    }
  }
}
