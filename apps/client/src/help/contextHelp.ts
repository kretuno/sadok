const routeArticles: Record<string, string> = {
  '/': 'first-start',
  '/inventory': 'menu-inventory',
  '/menu': 'menu-inventory',
  '/children': 'children-attendance',
  '/attendance': 'children-attendance',
  '/employees': 'employees',
  '/property': 'property-utilities',
  '/medical': 'medical-psychologist',
  '/psychologist': 'medical-psychologist',
  '/utilities': 'property-utilities',
  '/reports': 'reports-communication',
  '/notifications': 'reports-communication',
  '/settings': 'settings-users',
  '/about': 'troubleshooting-support',
};

export const getHelpArticleId = (pathname: string): string | null => {
  if (pathname === '/') return routeArticles['/'];
  const section = `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
  return routeArticles[section] ?? null;
};
