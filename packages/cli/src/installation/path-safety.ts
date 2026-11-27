import { isAbsolute, resolve, sep } from 'node:path';

export type PathSafetyErrorCode = 'UNSAFE_PATH';

export class PathSafetyError extends Error {
  readonly code: PathSafetyErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'PathSafetyError';
    this.code = 'UNSAFE_PATH';
    this.details = details ?? {};
  }
}

function hasTraversalSegment(value: string): boolean {
  return value.split(/[\\/]+/).includes('..');
}

function isWithinRoot(targetPath: string, projectRoot: string): boolean {
  const normalizedRoot = resolve(projectRoot);
  const normalizedTarget = resolve(normalizedRoot, targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + sep);
}

/**
 * Returns true when path is a safe relative path without traversal segments.
 * Does not validate containment within a project root.
 */
export function isSafePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) {
    return false;
  }
  if (path.includes('\0')) {
    return false;
  }
  if (isAbsolute(path)) {
    return false;
  }
  if (/^[A-Za-z]:/.test(path)) {
    return false;
  }
  if (hasTraversalSegment(path)) {
    return false;
  }
  return true;
}

/**
 * Validates that a target path is a safe relative path and resolves within projectRoot.
 */
export function validateTargetPath(targetPath: string, projectRoot: string): boolean {
  if (!isSafePath(targetPath)) {
    return false;
  }
  return isWithinRoot(targetPath, projectRoot);
}

/**
 * Throws PathSafetyError when path is unsafe or escapes projectRoot.
 */
export function assertSafePath(path: string, projectRoot: string): void {
  if (!validateTargetPath(path, projectRoot)) {
    throw new PathSafetyError(
      `Unsafe target path: "${path}". Paths must be relative and stay within the project root.`,
      { path, projectRoot },
    );
  }
}

/**
 * Resolves a source path against a target base directory safely within projectRoot.
 * Returns a project-root-relative POSIX-ish path string (using platform separators).
 */
export function resolveTargetPath(
  sourcePath: string,
  targetBase: string,
  projectRoot: string,
): string {
  assertSafePath(sourcePath, projectRoot);
  assertSafePath(targetBase, projectRoot);

  const combined = `${targetBase.replace(/[\\/]+$/, '')}/${sourcePath.replace(/^[\\/]+/, '')}`;
  // Normalize by resolving and then re-validating containment
  const resolved = resolve(projectRoot, combined);
  const normalizedRoot = resolve(projectRoot);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + sep)) {
    throw new PathSafetyError(`Resolved target path escapes project root: "${combined}".`, {
      sourcePath,
      targetBase,
      projectRoot,
    });
  }

  // Return relative-style path from root
  const rel = resolved.slice(normalizedRoot.length + (resolved === normalizedRoot ? 0 : 1));
  if (rel.length === 0) {
    throw new PathSafetyError(`Resolved target path must not be the project root: "${combined}".`, {
      sourcePath,
      targetBase,
      projectRoot,
    });
  }
  return rel;
}
