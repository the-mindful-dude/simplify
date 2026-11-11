import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assertSafePath } from './path-safety.js';

export type SafeWriteErrorCode =
  'WRITE_FAILED' | 'BACKUP_FAILED' | 'ROLLBACK_FAILED' | 'UNSAFE_PATH';

export class SafeWriteError extends Error {
  readonly code: SafeWriteErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: SafeWriteErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'SafeWriteError';
    this.code = code;
    this.details = details ?? {};
  }
}

export interface SafeWriteOptions {
  readonly targetPath: string;
  readonly content: string | Uint8Array;
  readonly backup?: boolean;
  readonly cwd?: string;
}

export interface BackupRecord {
  readonly originalPath: string;
  readonly backupPath: string;
  readonly timestamp: string;
}

export interface SafeWriteResult {
  readonly written: boolean;
  readonly backupPath?: string;
}

function resolveCwd(cwd?: string): string {
  return cwd ?? process.cwd();
}

function toAbsolute(targetPath: string, cwd: string): string {
  return resolve(cwd, targetPath);
}

function ensureSafe(targetPath: string, cwd: string): void {
  try {
    assertSafePath(targetPath, cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unsafe target path.';
    throw new SafeWriteError('UNSAFE_PATH', message, { targetPath, cwd });
  }
}

function tempPathFor(targetAbsolute: string): string {
  const suffix = `${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}`;
  return `${targetAbsolute}.tmp-${suffix}`;
}

export async function createBackup(filePath: string): Promise<BackupRecord> {
  const absolute = resolve(filePath);
  if (!existsSync(absolute)) {
    throw new SafeWriteError('BACKUP_FAILED', `Cannot back up missing file: "${filePath}".`, {
      filePath,
    });
  }

  const timestamp = new Date().toISOString();
  const backupPath = `${absolute}.bak-${timestamp.replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  try {
    copyFileSync(absolute, backupPath);
  } catch (error) {
    throw new SafeWriteError(
      'BACKUP_FAILED',
      `Failed to create backup for "${filePath}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      { filePath, backupPath },
    );
  }

  return { originalPath: absolute, backupPath, timestamp };
}

export async function safeWrite(options: SafeWriteOptions): Promise<SafeWriteResult> {
  const cwd = resolveCwd(options.cwd);
  const { targetPath, content, backup = false } = options;
  ensureSafe(targetPath, cwd);

  const absoluteTarget = toAbsolute(targetPath, cwd);
  const dir = dirname(absoluteTarget);
  let backupRecord: BackupRecord | undefined;
  let tempPath: string | undefined;

  try {
    mkdirSync(dir, { recursive: true });

    if (backup && existsSync(absoluteTarget)) {
      backupRecord = await createBackup(absoluteTarget);
    }

    tempPath = tempPathFor(absoluteTarget);
    const data =
      typeof content === 'string'
        ? content
        : Buffer.from(content.buffer, content.byteOffset, content.byteLength);
    writeFileSync(tempPath, data);
    renameSync(tempPath, absoluteTarget);
    tempPath = undefined;

    return {
      written: true,
      ...(backupRecord ? { backupPath: backupRecord.backupPath } : {}),
    };
  } catch (error) {
    if (tempPath && existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Best-effort cleanup.
      }
    }

    if (error instanceof SafeWriteError) {
      throw error;
    }

    throw new SafeWriteError(
      'WRITE_FAILED',
      `Failed to write "${targetPath}": ${error instanceof Error ? error.message : String(error)}`,
      {
        targetPath,
        cwd,
        backupCreated: backupRecord?.backupPath,
      },
    );
  }
}

export async function rollback(backups: BackupRecord[]): Promise<void> {
  const errors: Array<{ originalPath: string; message: string }> = [];

  // Restore in reverse order for multi-file operations.
  for (let index = backups.length - 1; index >= 0; index -= 1) {
    const record = backups[index]!;
    try {
      if (!existsSync(record.backupPath)) {
        throw new Error(`Backup file missing: "${record.backupPath}"`);
      }
      mkdirSync(dirname(record.originalPath), { recursive: true });
      const tempRestore = tempPathFor(record.originalPath);
      copyFileSync(record.backupPath, tempRestore);
      renameSync(tempRestore, record.originalPath);
      try {
        unlinkSync(record.backupPath);
      } catch {
        // Keep backup if cleanup fails.
      }
    } catch (error) {
      errors.push({
        originalPath: record.originalPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (errors.length > 0) {
    throw new SafeWriteError('ROLLBACK_FAILED', `Failed to rollback ${errors.length} file(s).`, {
      errors,
    });
  }
}
