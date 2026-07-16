export const getLicenseRefreshIntervalMs = (isActivated: boolean): number =>
  isActivated ? 60_000 : 30_000;
