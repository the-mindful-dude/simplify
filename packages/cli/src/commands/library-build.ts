import type { Command } from './index.js';
import { buildLibrary, type BuildResult } from '@simplify-dev/tooling';
import { CliError, info, success } from '../cli.js';

export const libraryBuildCommand: Command = {
  name: 'library-build',
  description: 'Build a library for publishing.',
  options: [
    {
      name: 'path',
      type: 'string',
      description: 'Path to the library root (defaults to the current directory).',
    },
    {
      name: 'output-dir',
      type: 'string',
      description: 'Directory to write build artifacts to (defaults to ./dist/simplify-build).',
    },
    {
      name: 'version',
      type: 'string',
      description: 'Library version to build (overrides the manifest version).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would be built without writing files.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, options, dryRun, json } = context;

    if (args.length > 0) {
      throw new CliError(
        `library-build does not accept arguments: ${args.join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const libraryRoot = typeof options.path === 'string' ? options.path : process.cwd();
    const outputDir =
      typeof options['output-dir'] === 'string' ? options['output-dir'] : './dist/simplify-build';
    const version = typeof options.version === 'string' ? options.version : undefined;

    info(dryRun ? '[dry-run] Would build library.' : 'Building library...', json);

    let result: BuildResult;
    try {
      result = await buildLibrary(libraryRoot, { libraryRoot, outputDir, dryRun, version });
    } catch (err) {
      throw new CliError(`Failed to build library: ${(err as Error).message}`, 'BUILD_FAILED');
    }

    if (json) {
      console.log(
        JSON.stringify(
          {
            artifacts: result.artifacts,
            metadata: result.metadata,
            deterministic: result.deterministic,
          },
          null,
          2,
        ),
      );
      if (dryRun) {
        info('Dry-run complete. No files were written.', json);
      }
      return;
    }

    info(`Library: ${result.metadata.libraryId}`, json);
    info(`Version: ${result.metadata.version}`, json);
    info(`Files included: ${result.artifacts.length}`, json);
    info(`Deterministic: ${result.deterministic}`, json);
    if (result.metadata.sourceCommitSha !== null) {
      info(`Source commit: ${result.metadata.sourceCommitSha}`, json);
    }

    if (dryRun) {
      info('Dry-run complete. No files were written.', json);
      return;
    }

    success(`Library built: ${result.artifacts.length} artifact(s) in ${outputDir}`, json);
  },
};
