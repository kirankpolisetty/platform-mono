import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  themeQuartz,
  ValueFormatterParams
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule, TextFilterModule, NumberFilterModule]);

type AssetRecord = {
  id: string;
  assetName: string;
  region: string;
  owner: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  environment: 'Prod' | 'Stage' | 'Dev';
  throughput: number;
  incidentCount: number;
  refreshMinutes: number;
  lastSynced: string;
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
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

  readonly defaultColDef: ColDef<AssetRecord> = {
    filter: true,
    floatingFilter: true,
    minWidth: 140,
    resizable: true,
    sortable: true
  };

  readonly columnDefs: ColDef<AssetRecord>[] = [
    { field: 'id', headerName: 'Asset ID', pinned: 'left', minWidth: 130 },
    { field: 'assetName', headerName: 'Asset Name', minWidth: 220 },
    { field: 'region', headerName: 'Region', minWidth: 150 },
    { field: 'owner', headerName: 'Owner', minWidth: 170 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 140,
      cellClass: (params) => `status-cell status-${String(params.value).toLowerCase()}`
    },
    { field: 'environment', headerName: 'Env', minWidth: 120 },
    {
      field: 'throughput',
      headerName: 'Throughput / hr',
      filter: 'agNumberColumnFilter',
      minWidth: 170,
      valueFormatter: numberFormatter
    },
    {
      field: 'incidentCount',
      headerName: 'Incidents',
      filter: 'agNumberColumnFilter',
      minWidth: 130
    },
    {
      field: 'refreshMinutes',
      headerName: 'Refresh (min)',
      filter: 'agNumberColumnFilter',
      minWidth: 150
    },
    { field: 'lastSynced', headerName: 'Last Synced', minWidth: 190 }
  ];

  readonly rowData: AssetRecord[] = createAssetRows(2500);

  readonly totalAssets = this.rowData.length;
  readonly warningCount = this.rowData.filter((row) => row.status === 'Warning').length;
  readonly criticalCount = this.rowData.filter((row) => row.status === 'Critical').length;
  readonly averageRefreshMinutes = Math.round(
    this.rowData.reduce((sum, row) => sum + row.refreshMinutes, 0) / this.rowData.length
  );

  quickFilterText = '';
}

const numberFormatter = (params: ValueFormatterParams<AssetRecord, number>) =>
  params.value?.toLocaleString('en-US') ?? '';

function createAssetRows(count: number): AssetRecord[] {
  const regions = ['North America', 'Europe', 'APAC', 'Middle East', 'LATAM'];
  const owners = ['Retail Ops', 'Supply Chain', 'Risk Desk', 'Loyalty', 'Platform', 'Finance'];
  const environments: AssetRecord['environment'][] = ['Prod', 'Stage', 'Dev'];
  const statuses: AssetRecord['status'][] = ['Healthy', 'Warning', 'Critical'];

  return Array.from({ length: count }, (_, index) => {
    const assetNumber = index + 1;
    const status = statuses[index % statuses.length];
    const refreshMinutes = 3 + (index % 11) * 2;
    const throughput = 10000 + ((index * 137) % 85000);
    const incidents = status === 'Critical' ? 4 + (index % 5) : status === 'Warning' ? 1 + (index % 4) : index % 2;

    return {
      id: `AST-${String(assetNumber).padStart(5, '0')}`,
      assetName: `Oracle feed ${assetNumber}`,
      region: regions[index % regions.length],
      owner: owners[index % owners.length],
      status,
      environment: environments[index % environments.length],
      throughput,
      incidentCount: incidents,
      refreshMinutes,
      lastSynced: `2026-04-${String((index % 28) + 1).padStart(2, '0')} ${String(
        8 + (index % 11)
      ).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`
    };
  });
}
