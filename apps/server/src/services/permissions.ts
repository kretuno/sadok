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
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return parsePermissions(JSON.parse(value));
  } catch {
    return {};
  }
};

const emptyModulePermissions = (): ModulePermissions => ({
  view: false,
  edit: false,
  delete: false,
  print: false,
});

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

  if (!isRecord(parsed)) {
    return normalized;
  }

  if (parsed.version === 2 && isRecord(parsed.modules)) {
    for (const module of permissionModules) {
      const moduleValue = parsed.modules[module];
      const next = emptyModulePermissions();

      if (isRecord(moduleValue)) {
        for (const action of permissionActions) {
          next[action] = moduleValue[action] === true;
        }
      }

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
    const legacyValue = parsed[module];

    if (legacyValue === true) {
      normalized.modules[module] = { view: true, edit: true, delete: true, print: true };
    } else if (legacyValue === 'edit') {
      normalized.modules[module] = { view: true, edit: true, delete: false, print: true };
    } else if (legacyValue === 'view') {
      normalized.modules[module] = { view: true, edit: false, delete: false, print: true };
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
  if (role === 'admin') {
    return true;
  }

  return normalizePermissionMatrix(rawPermissions).modules[module][action];
};
