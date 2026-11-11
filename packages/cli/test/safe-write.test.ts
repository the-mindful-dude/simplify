import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBackup,
  rollback,
  safeWrite,
  SafeWriteError,
  type BackupRecord,
} from '../src/installation/safe-write.js';
import { assertSafePath, isSafePath, validateTargetPath } from '../src/installation/path-safety.js';

const mockExistsSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockRenameSync = vi.hoisted(() => vi.fn());
const mockCopyFileSync = vi.hoisted(() => vi.fn());
const mockUnlinkSync = vi.hoisted(() => vi.fn());

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    renameSync: mockRenameSync,
    copyFileSync: mockCopyFileSync,
    unlinkSync: mockUnlinkSync,
  };
});

const CWD = '/test/project';

beforeEach(() => {
  vi.resetAllMocks();
  mockExistsSync.mockReturnValue(false);
});

describe('path-safety', () => {
  it('accepts safe relative paths inside project', () => {
    expect(isSafePath('src/file.ts')).toBe(true);
    expect(validateTargetPath('src/file.ts', CWD)).toBe(true);
    expect(() => assertSafePath('src/file.ts', CWD)).not.toThrow();
  });

  it('rejects traversal and absolute/outside paths', () => {
    expect(validateTargetPath('../secrets.txt', CWD)).toBe(false);
    expect(validateTargetPath('/etc/passwd', CWD)).toBe(false);
    expect(validateTargetPath('src/../../etc/passwd', CWD)).toBe(false);
    expect(() => assertSafePath('../secrets.txt', CWD)).toThrow();
  });
});

describe('safeWrite', () => {
  it('writes successfully using temp file + rename', async () => {
    const result = await safeWrite({
      targetPath: 'src/new-file.ts',
      content: 'export const x = 1;\n',
      cwd: CWD,
    });

    expect(result.written).toBe(true);
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockRenameSync).toHaveBeenCalledTimes(1);
    const tempPath = String(mockWriteFileSync.mock.calls[0]![0]);
    const finalPath = String(mockRenameSync.mock.calls[0]![1]);
    expect(tempPath).toContain('.tmp-');
    expect(finalPath).toBe(`${CWD}/src/new-file.ts`);
  });

  it('creates backup when overwriting existing file', async () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p) === `${CWD}/src/existing.ts`);

    const result = await safeWrite({
      targetPath: 'src/existing.ts',
      content: 'updated',
      backup: true,
      cwd: CWD,
    });

    expect(result.written).toBe(true);
    expect(result.backupPath).toBeDefined();
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
    expect(String(mockCopyFileSync.mock.calls[0]![0])).toBe(`${CWD}/src/existing.ts`);
  });

  it('rejects path traversal', async () => {
    await expect(
      safeWrite({ targetPath: '../outside.txt', content: 'x', cwd: CWD }),
    ).rejects.toMatchObject({
      name: 'SafeWriteError',
      code: 'UNSAFE_PATH',
    });
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('throws WRITE_FAILED on write errors and cleans temp file best-effort', async () => {
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('disk full');
    });
    // temp path existence check for cleanup
    mockExistsSync.mockReturnValue(false);

    await expect(
      safeWrite({ targetPath: 'src/file.ts', content: 'x', cwd: CWD }),
    ).rejects.toMatchObject({
      name: 'SafeWriteError',
      code: 'WRITE_FAILED',
    });
  });

  it('throws BACKUP_FAILED when createBackup target missing', async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(createBackup(`${CWD}/missing.ts`)).rejects.toMatchObject({
      name: 'SafeWriteError',
      code: 'BACKUP_FAILED',
    });
  });
});

describe('rollback', () => {
  it('restores files from backups in reverse order', async () => {
    const backups: BackupRecord[] = [
      {
        originalPath: `${CWD}/a.ts`,
        backupPath: `${CWD}/a.ts.bak-1`,
        timestamp: 't1',
      },
      {
        originalPath: `${CWD}/b.ts`,
        backupPath: `${CWD}/b.ts.bak-2`,
        timestamp: 't2',
      },
    ];
    mockExistsSync.mockReturnValue(true);

    await rollback(backups);

    expect(mockCopyFileSync).toHaveBeenCalledTimes(2);
    // reverse order: b then a
    expect(String(mockCopyFileSync.mock.calls[0]![0])).toBe(`${CWD}/b.ts.bak-2`);
    expect(String(mockCopyFileSync.mock.calls[1]![0])).toBe(`${CWD}/a.ts.bak-1`);
    expect(mockRenameSync).toHaveBeenCalledTimes(2);
  });

  it('throws ROLLBACK_FAILED if a backup cannot be restored', async () => {
    const backups: BackupRecord[] = [
      {
        originalPath: `${CWD}/a.ts`,
        backupPath: `${CWD}/a.ts.bak-1`,
        timestamp: 't1',
      },
    ];
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('.bak-1'));
    mockCopyFileSync.mockImplementation(() => {
      throw new Error('permission denied');
    });

    await expect(rollback(backups)).rejects.toMatchObject({
      name: 'SafeWriteError',
      code: 'ROLLBACK_FAILED',
    });
  });
});

describe('multi-file rollback on failure (simulated)', () => {
  it('can rollback previous backups when later write fails', async () => {
    // First write succeeds and creates backup
    mockExistsSync.mockImplementation((p: unknown) => String(p) === `${CWD}/a.ts`);
    const first = await safeWrite({
      targetPath: 'a.ts',
      content: 'new-a',
      backup: true,
      cwd: CWD,
    });
    expect(first.backupPath).toBeDefined();

    // Second write fails
    mockWriteFileSync.mockImplementation(() => {
      throw new Error('disk full');
    });
    mockExistsSync.mockReturnValue(false);
    const backups: BackupRecord[] = [
      {
        originalPath: `${CWD}/a.ts`,
        backupPath: first.backupPath!,
        timestamp: 't',
      },
    ];
    await expect(safeWrite({ targetPath: 'b.ts', content: 'x', cwd: CWD })).rejects.toBeInstanceOf(
      SafeWriteError,
    );

    // Restore setup for rollback
    vi.resetAllMocks();
    mockExistsSync.mockReturnValue(true);
    await rollback(backups);
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
  });
});

describe('dry-run handling (path validation only)', () => {
  it('safeWrite still validates paths in caller dry-run flows', async () => {
    await expect(
      safeWrite({ targetPath: '../../evil', content: '', cwd: CWD }),
    ).rejects.toMatchObject({ code: 'UNSAFE_PATH' });
  });
});
