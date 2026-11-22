import type { BadgeVariant } from '@simplify-dev/ui';

/** The nine presentation states shared by every status surface. */
export type StatusState =
  | 'idle'
  | 'loading'
  | 'pending'
  | 'success'
  | 'failure'
  | 'retry'
  | 'duplicate'
  | 'unavailable'
  | 'empty';

export type StatusDomain = 'webhook' | 'sync' | 'github' | 'repository';

/** Safe, serializable presentation input. No raw errors or secrets belong here. */
export interface StatusView {
  readonly domain: StatusDomain;
  readonly title: string;
  readonly state: StatusState;
  readonly summary: string;
  readonly detail?: string;
  readonly observedAt?: string;
  readonly refreshable?: boolean;
}

const BADGE_VARIANT: Record<StatusState, BadgeVariant> = {
  idle: 'neutral',
  loading: 'info',
  pending: 'info',
  success: 'success',
  failure: 'danger',
  retry: 'warning',
  duplicate: 'warning',
  unavailable: 'info',
  empty: 'neutral',
};

const LABEL: Record<StatusState, string> = {
  idle: 'Idle',
  loading: 'Loading',
  pending: 'Pending',
  success: 'Ready',
  failure: 'Failed',
  retry: 'Retrying',
  duplicate: 'Duplicate',
  unavailable: 'Unavailable',
  empty: 'Empty',
};

/** Map a state to the existing Badge contract; never rely on color alone. */
export function statusBadgeVariant(state: StatusState): BadgeVariant {
  return BADGE_VARIANT[state];
}

/** Visible, announced text for a state. */
export function statusLabel(state: StatusState): string {
  return LABEL[state];
}

/** States that show an in-flight indicator and set `aria-busy`. */
export function statusIsInFlight(state: StatusState): boolean {
  return state === 'loading' || state === 'pending' || state === 'retry';
}

/** Single, concise message for the polite live region after a refresh. */
export function statusAnnouncement(views: readonly StatusView[]): string {
  const summary = views.map((view) => `${view.title}: ${statusLabel(view.state)}`).join('. ');
  return `Status refreshed. ${summary}.`;
}
