export const TERMINAL_REMOTE_LICENSE_STATUSES = ['revoked', 'expired'] as const;

export const shouldRemoveInstalledLicense = (status: string): boolean =>
  TERMINAL_REMOTE_LICENSE_STATUSES.includes(
    status.trim().toLowerCase() as (typeof TERMINAL_REMOTE_LICENSE_STATUSES)[number],
  );
