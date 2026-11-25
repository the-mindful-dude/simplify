/**
 * Stable application route paths. The object is frozen so no consumer can
 * mutate the shared navigation contract at runtime.
 */
export const APP_ROUTES = Object.freeze({
  home: '/',
  explore: '/explore',
  docs: '/docs',
  dashboard: '/dashboard',
  dashboardLibrary: '/dashboard/library',
  dashboardCollections: '/dashboard/collections',
  dashboardCompositions: '/dashboard/compositions',
  dashboardPublishers: '/dashboard/publishers',
  dashboardAnalytics: '/dashboard/analytics',
  settings: '/dashboard/settings',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
} as const);

/** A path from the frozen route table. Dynamic segments are appended by the caller. */
export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/**
 * Plain data a domain contributes to the single shell navigation config through
 * the composition root. Domains never export sidebar components or shell state.
 */
export interface NavContribution {
  readonly id: string;
  readonly label: string;
  /** Application-relative path; dynamic segments are appended by the contributor. */
  readonly href: string;
  readonly group: string;
  readonly order?: number;
  readonly description?: string;
}

/**
 * A locally defined workspace offered by the shell switcher. Workspaces are
 * preference data only: no server, account or credential linkage is implied.
 */
export interface Workspace {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}
