export const permissionModules = [
  'inventory',
  'children',
  'menu',
  'employees',
  'property',
  'medical',
  'attendance',
  'psychologist',
  'utilities',
  'reports',
] as const;

export const permissionActions = ['view', 'edit', 'delete', 'print'] as const;

export type PermissionModule = (typeof permissionModules)[number];
export type PermissionAction = (typeof permissionActions)[number];
export type ModulePermissions = Record<PermissionAction, boolean>;

export interface PermissionMatrix {
  version: 2;
  modules: Record<PermissionModule, ModulePermissions>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parsePermissions = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return parsePermissions(JSON.parse(value));
  } catch {
    return {};
  }
};

export const createDefaultPermissionMatrix = (): PermissionMatrix => ({
  version: 2,
  modules: Object.fromEntries(
    permissionModules.map((module) => [
      module,
      { view: true, edit: false, delete: false, print: true },
    ])
  ) as Record<PermissionModule, ModulePermissions>,
});

export const normalizePermissionMatrix = (rawPermissions: unknown): PermissionMatrix => {
  const parsed = parsePermissions(rawPermissions);
  const normalized = createDefaultPermissionMatrix();

  if (!isRecord(parsed)) return normalized;

  if (parsed.version === 2 && isRecord(parsed.modules)) {
    for (const module of permissionModules) {
      const value = parsed.modules[module];
      const next = {
        view: isRecord(value) && value.view === true,
        edit: isRecord(value) && value.edit === true,
        delete: isRecord(value) && value.delete === true,
        print: isRecord(value) && value.print === true,
      };

      if (next.edit || next.delete || next.print) {
        next.view = true;
      }

      normalized.modules[module] = next;
    }
    return normalized;
  }

  if (parsed.all === true) {
    for (const module of permissionModules) {
      normalized.modules[module] = { view: true, edit: true, delete: true, print: true };
    }
    return normalized;
  }

  for (const module of permissionModules) {
    const value = parsed[module];
    if (value === true) {
      normalized.modules[module] = { view: true, edit: true, delete: true, print: true };
    } else if (value === 'edit') {
      normalized.modules[module] = { view: true, edit: true, delete: false, print: true };
    }
  }

  return normalized;
};

export const hasPermission = (
  role: string,
  rawPermissions: unknown,
  module: PermissionModule,
  action: PermissionAction
): boolean => {
  if (role === 'admin') return true;
  return normalizePermissionMatrix(rawPermissions).modules[module][action];
};
