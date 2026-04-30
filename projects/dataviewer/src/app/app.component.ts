import { CommonModule } from '@angular/common';
import { Component, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
  TextFilterModule,
  themeQuartz,
  type Module
} from 'ag-grid-community';

type CoreDescriptionRecord = {
  wellName: string;
  coreNumber: number;
  topDepth: number;
  rockType: string;
  sheet: number;
  descNumber: number;
  bottomDepth: number;
  reservoir: string;
  coreDesc: string;
};

type CoreDescriptionMetadata = {
  descNumber: number;
  coreNumber: number;
  topDepth: number;
  bottomDepth: number;
  reservoir: string;
  coreDesc: string;
};

const CORE_DESCRIPTION_VIEWER_PATH = '/coredescriptionviewer/#/coredescription/5678';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly selectedDescNumber = input<number | null>(null);
  readonly modules: Module[] = [AllCommunityModule, TextFilterModule];

  readonly theme = themeQuartz.withParams({
    accentColor: '#9f5718',
    backgroundColor: '#fff9f0',
    borderColor: '#e5c9a6',
    browserColorScheme: 'light',
    chromeBackgroundColor: '#fff2df',
    foregroundColor: '#2f1a08',
    headerBackgroundColor: '#4a2a10',
    headerFontSize: 13,
    headerTextColor: '#fffaf2',
    rowBorder: true,
    spacing: 10
  });

  readonly defaultColDef: ColDef<CoreDescriptionRecord> = {
    filter: true,
    floatingFilter: true,
    minWidth: 140,
    resizable: true,
    sortable: true
  };

  readonly rowSelection: RowSelectionOptions<CoreDescriptionRecord> = {
    mode: 'singleRow',
    checkboxes: true,
    enableClickSelection: true
  };

  readonly columnDefs: ColDef<CoreDescriptionRecord>[] = [
    {
      field: 'wellName',
      headerName: 'Well Name',
      pinned: 'left',
      minWidth: 180
    },
    { field: 'coreNumber', headerName: 'Core Number', minWidth: 150 },
    { field: 'topDepth', headerName: 'Top Depth', minWidth: 150 },
    { field: 'rockType', headerName: 'Rock Type', minWidth: 150 },
    { field: 'sheet', headerName: 'Sheet', minWidth: 140 },
    { field: 'descNumber', headerName: 'Desc NO.', minWidth: 150 }
  ];

  readonly rowData: CoreDescriptionRecord[] = [
    {
      wellName: 'WAQR_21.0',
      coreNumber: 1,
      topDepth: 14310,
      rockType: 'CLAST',
      sheet: 8345,
      descNumber: 59664,
      bottomDepth: 14346,
      reservoir: 'UNZA',
      coreDesc: 'Anzi'
    },
    {
      wellName: 'WAQR_21.0',
      coreNumber: 1,
      topDepth: 14310,
      rockType: 'CLAST',
      sheet: 10172,
      descNumber: 63774,
      bottomDepth: 14376,
      reservoir: 'UNZA',
      coreDesc: 'Garner'
    },
    {
      wellName: 'WAQR_21.0',
      coreNumber: 1,
      topDepth: 14310,
      rockType: 'CLAST',
      sheet: 8345,
      descNumber: 59667,
      bottomDepth: 14376,
      reservoir: 'UNZA',
      coreDesc: 'Garner'
    }
  ];

  readonly totalAssets = this.rowData.length;
  readonly warningCount = this.rowData.filter((row) => row.coreNumber === 1).length;
  readonly criticalCount = this.rowData.filter((row) => row.coreNumber === 2).length;
  readonly averageRefreshMinutes = Math.round(this.rowData.length / 12);

  quickFilterText = '';
  readonly selectedRecord = signal<CoreDescriptionRecord | null>(null);
  private gridApi: GridApi<CoreDescriptionRecord> | null = null;

  constructor() {
    effect(() => {
      this.selectedDescNumber();
      this.selectRowFromInput();
    });
  }

  openViewer(): void {
    window.open(`${window.location.origin}${CORE_DESCRIPTION_VIEWER_PATH}`, '_blank', 'noopener,noreferrer');
  }

  onGridReady(event: GridReadyEvent<CoreDescriptionRecord>): void {
    this.gridApi = event.api;
    this.selectRowFromInput();
  }

  onSelectionChanged(event: SelectionChangedEvent<CoreDescriptionRecord>): void {
    const selectedRecord = event.api.getSelectedRows()[0] ?? null;
    this.selectedRecord.set(selectedRecord);

    if (!selectedRecord) {
      window.dispatchEvent(new CustomEvent('coral:description-cleared'));
      return;
    }

    window.dispatchEvent(
      new CustomEvent<CoreDescriptionMetadata>('coral:description-selected', {
        detail: {
          descNumber: selectedRecord.descNumber,
          coreNumber: selectedRecord.coreNumber,
          topDepth: selectedRecord.topDepth,
          bottomDepth: selectedRecord.bottomDepth,
          reservoir: selectedRecord.reservoir,
          coreDesc: selectedRecord.coreDesc
        }
      })
    );
  }

  private selectRowFromInput(): void {
    const descNumber = this.selectedDescNumber();

    if (!this.gridApi) {
      return;
    }

    if (!descNumber) {
      this.selectedRecord.set(null);
      this.gridApi.deselectAll();
      return;
    }

    const selectedRecord = this.rowData.find((row) => row.descNumber === descNumber) ?? null;
    this.selectedRecord.set(selectedRecord);

    this.gridApi.forEachNode((node) => {
      node.setSelected(node.data?.descNumber === descNumber);
    });
  }
}
