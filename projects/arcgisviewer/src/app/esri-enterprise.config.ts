export const esriEnterpriseConfig = {
  esriUrl: 'https://enterprisegis.enp.aramco.com.sa/arcgis',
  appId: 'NNNNNN',
  earthLayer: {
    mapServerUrl: 'https://eccenterpise.aramco.com/argcis/EARTH/EARTH_AYERS/MpServer'
  }
} as const;

export function isConfiguredAppId(appId: string): boolean {
  return appId.trim() !== '' && appId !== 'NNNNNN';
}
