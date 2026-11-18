import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { Command } from './index.js';
import { CliError, info, success } from '../cli.js';
import {
  DEFAULT_SIMPLIFY_WORKFLOW_PATH,
  SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE,
  SIMPLIFY_LIBRARY_WORKFLOW_VERSION,
} from '../workflows/simplify-library.js';

interface WorkflowCommandOptions {
  readonly output: string;
  readonly targetDir: string;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly json: boolean;
}

function resolveOptions(context: {
  readonly options: Readonly<Record<string, string | boolean>>;
  readonly dryRun: boolean;
  readonly json: boolean;
}): WorkflowCommandOptions {
  const { options, dryRun, json } = context;
  const targetDir =
    typeof options['target-dir'] === 'string' && options['target-dir'].length > 0
      ? options['target-dir']
      : process.cwd();
  const outputOption =
    typeof options.output === 'string' && options.output.length > 0
      ? options.output
      : DEFAULT_SIMPLIFY_WORKFLOW_PATH;
  const output = isAbsolute(outputOption) ? outputOption : resolve(targetDir, outputOption);
  const force = options.force === true;

  return { output, targetDir, force, dryRun, json };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export const libraryWorkflowCommand: Command = {
  name: 'library-workflow',
  description: 'Generate the canonical simplify.dev GitHub Actions workflow for a library.',
  options: [
    {
      name: 'output',
      type: 'string',
      description:
        'Output path for the workflow file (defaults to .github/workflows/simplify.yml under --target-dir).',
    },
    {
      name: 'target-dir',
      type: 'string',
      description:
        'Target directory for the library repository (defaults to the current directory).',
    },
    {
      name: 'force',
      type: 'boolean',
      description: 'Overwrite an existing workflow file.',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
    {
      name: 'json',
      type: 'boolean',
      description: 'Machine-readable JSON output.',
    },
  ],
  handler: async (context) => {
    const { args, dryRun, json } = context;
    const options = resolveOptions(context);

    if (args.length > 0) {
      throw new CliError(
        `library-workflow does not accept arguments: ${args.join(' ')}`,
        'INVALID_ARGUMENT',
      );
    }

    const exists = await fileExists(options.output);

    info(
      dryRun
        ? `[dry-run] Would generate simplify.dev workflow v${SIMPLIFY_LIBRARY_WORKFLOW_VERSION} at ${options.output}.`
        : `Generating simplify.dev workflow v${SIMPLIFY_LIBRARY_WORKFLOW_VERSION} at ${options.output}...`,
      json,
    );

    if (dryRun) {
      if (exists && !options.force) {
        info(
          `[dry-run] File already exists and would be left unchanged without --force: ${options.output}.`,
          json,
        );
      } else if (exists && options.force) {
        info(`[dry-run] Would overwrite existing workflow file: ${options.output}.`, json);
      } else {
        info(`[dry-run] Would create workflow file: ${options.output}.`, json);
      }
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    if (exists && !options.force) {
      throw new CliError(
        `Workflow file already exists: ${options.output}. Use --force to overwrite.`,
        'FILE_EXISTS',
      );
    }

    await fs.mkdir(dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, SIMPLIFY_LIBRARY_WORKFLOW_TEMPLATE, {
      encoding: 'utf8',
      flag: options.force ? 'w' : 'wx',
    });

    if (json) {
      console.log(
        JSON.stringify(
          {
            action: exists ? 'overwritten' : 'created',
            output: options.output,
            workflowVersion: SIMPLIFY_LIBRARY_WORKFLOW_VERSION,
          },
          null,
          2,
        ),
      );
    }

    success(
      `${exists ? 'Updated' : 'Created'} simplify.dev workflow v${SIMPLIFY_LIBRARY_WORKFLOW_VERSION}: ${options.output}`,
      json,
    );
    info(
      'Commit .github/workflows/simplify.yml and configure required secrets (e.g. SIMPLIFY_PUBLISH_TOKEN) for trusted tag/release publishing.',
      json,
    );
  },
};
