import { describe, expect, it } from 'vitest';
import {
  APP_ROUTES,
  RepositoryError,
  type AsyncState,
  type NavContribution,
  type Workspace,
} from '../src/index.js';

describe('APP_ROUTES', () => {
  it('is a frozen set of application-relative paths', () => {
    expect(Object.isFrozen(APP_ROUTES)).toBe(true);
    expect(APP_ROUTES.home).toBe('/');
    expect(APP_ROUTES.explore).toBe('/explore');
    expect(APP_ROUTES.dashboard).toBe('/dashboard');
    expect(APP_ROUTES.login).toBe('/login');

    for (const route of Object.values(APP_ROUTES)) {
      expect(route.startsWith('/')).toBe(true);
    }
  });
});

describe('RepositoryError', () => {
  it('carries a stable code, message, cause and defensive details', () => {
    const cause = new Error('socket closed');
    const details = { assetId: 'button', attemptedVersion: '1.0.0' };
    const error = new RepositoryError({
      code: 'unavailable',
      message: 'Registry source is unavailable',
      cause,
      details,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RepositoryError);
    expect(error.name).toBe('RepositoryError');
    expect(error.code).toBe('unavailable');
    expect(error.message).toBe('Registry source is unavailable');
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ assetId: 'button', attemptedVersion: '1.0.0' });
    expect(Object.isFrozen(error.details)).toBe(true);

    details.assetId = 'mutated';
    expect(error.details).toEqual({ assetId: 'button', attemptedVersion: '1.0.0' });
  });

  it('has a safe empty default when details and cause are omitted', () => {
    const error = new RepositoryError({ code: 'not_found', message: 'Missing asset' });

    expect(error.details).toEqual({});
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(error.cause).toBeUndefined();
  });
});

describe('AsyncState', () => {
  it('discriminates loading, empty, error and success states', () => {
    const error = new RepositoryError({ code: 'invalid_input', message: 'Bad filter' });
    const states: readonly AsyncState<{ id: string }>[] = [
      { status: 'loading' },
      { status: 'empty' },
      { status: 'error', error },
      { status: 'success', data: { id: 'button' } },
    ];

    expect(states.map((state) => state.status)).toEqual(['loading', 'empty', 'error', 'success']);

    const errorState = states[2];
    const successState = states[3];
    if (errorState?.status === 'error' && successState?.status === 'success') {
      expect(errorState.error).toBe(error);
      expect(successState.data.id).toBe('button');
      return;
    }

    throw new Error('AsyncState variants did not narrow by status as expected');
  });
});

describe('navigation and workspace contracts', () => {
  it('accepts contribution and workspace data with no framework or transport dependencies', () => {
    const contribution: NavContribution = {
      id: 'registry:explore',
      label: 'Explore',
      href: APP_ROUTES.explore,
      group: 'discover',
      order: 10,
    };
    const workspace: Workspace = {
      id: 'local',
      label: 'Local workspace',
      description: 'Fixture-backed local workspace',
    };

    expect(contribution.href).toBe('/explore');
    expect(workspace.id).toBe('local');
  });
});
