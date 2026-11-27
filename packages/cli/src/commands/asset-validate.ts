import type { Command } from './index.js';
import {
  validateAssetManifest,
  validateLibrary,
  type LibraryValidationResult,
} from '@simplify-dev/tooling';
import { CliError, error, info, success } from '../cli.js';

export const assetValidateCommand: Command = {
  name: 'asset',
  description: 'Validate asset and library manifests locally or in CI.',
  options: [
    {
      name: 'path',
      type: 'string',
      description:
        'Path to an asset manifest file or library root (defaults to the current directory).',
    },
    {
      name: 'library',
      type: 'boolean',
      description: 'Validate the entire library at --path instead of a single asset manifest.',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would be validated without making changes.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, json } = context;

    if (args[0] !== 'validate') {
      throw new CliError(
        `Unknown asset subcommand: "${args[0] ?? ''}". Usage: simplify asset validate [options]`,
        'UNKNOWN_ASSET_SUBCOMMAND',
      );
    }

    if (args.length > 1) {
      throw new CliError(
        `asset validate does not accept arguments: ${args.slice(1).join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const target = typeof options.path === 'string' ? options.path : process.cwd();
    const isLibrary = options.library === true;

    if (dryRun) {
      info(`[dry-run] Would validate ${isLibrary ? 'library' : 'asset'} at "${target}".`, json);
    }

    let result: LibraryValidationResult;
    let assets: readonly { readonly manifest: string; readonly valid: boolean }[] = [];

    if (isLibrary) {
      result = await validateLibrary(target);
      assets = result.assets;
    } else {
      const manifestResult = await validateAssetManifest(target);
      result = {
        valid: manifestResult.valid,
        assets: [
          {
            manifest: target,
            valid: manifestResult.valid,
            ...(manifestResult.value !== undefined ? { asset: manifestResult.value } : {}),
            issues: manifestResult.issues,
          },
        ],
        issues: manifestResult.issues,
      };
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const targetLabel = isLibrary ? 'library' : 'asset manifest';
      info(
        dryRun
          ? `[dry-run] Validated ${targetLabel} at "${target}".`
          : `Validated ${targetLabel} at "${target}".`,
        json,
      );

      for (const asset of assets) {
        info(`  ${asset.valid ? '✓' : '✗'} ${asset.manifest}`, json);
      }

      for (const issue of result.issues) {
        const manifestLabel = issue.manifest ? `${issue.manifest}: ` : '';
        error(`${manifestLabel}${issue.path} ${issue.message}`, json);
      }

      if (result.valid) {
        success(
          assets.length > 0
            ? `Validation passed (${assets.length} asset(s)).`
            : 'Validation passed.',
          json,
        );
      } else {
        error(`Validation failed with ${result.issues.length} issue(s).`, json);
      }
    }

    if (!result.valid) {
      throw new CliError('Validation failed.', 'VALIDATION_FAILED');
    }
  },
};
