export const getLicenseRefreshIntervalMs = (isActivated: boolean): number =>
  isActivated ? 60_000 : 30_000;

export const shouldRefreshSettingsAfterLicenseSync = (result: {
  activated?: boolean;
  status?: string;
}): boolean =>
  Boolean(result.activated) || ['revoked', 'expired'].includes(String(result.status || '').toLowerCase());
