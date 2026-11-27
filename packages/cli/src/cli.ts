#!/usr/bin/env node

import { commands, getCommand } from './commands/index.js';

export interface CommandContext {
  readonly args: readonly string[];
  readonly options: Readonly<Record<string, string | boolean>>;
  readonly dryRun: boolean;
  readonly verbose: boolean;
  readonly debug: boolean;
  readonly json: boolean;
  readonly interactive: boolean;
}

export class CliError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
  }
}

export type OutputLevel = 'success' | 'warning' | 'error' | 'info';

const OUTPUT_PREFIXES: Readonly<Record<OutputLevel, string>> = {
  success: '✓',
  warning: '⚠',
  error: '✗',
  info: 'ℹ',
};

export function formatOutput(level: OutputLevel, message: string, json: boolean): string {
  if (json) {
    return JSON.stringify({ level, message });
  }
  return `${OUTPUT_PREFIXES[level]} ${message}`;
}

export function success(message: string, json: boolean): void {
  console.log(formatOutput('success', message, json));
}

export function warning(message: string, json: boolean): void {
  console.log(formatOutput('warning', message, json));
}

export function error(message: string, json: boolean): void {
  console.error(formatOutput('error', message, json));
}

export function info(message: string, json: boolean): void {
  console.log(formatOutput('info', message, json));
}

export function isInteractive(interactive?: boolean): boolean {
  if (interactive === true) return true;
  if (interactive === false) return false;
  return typeof process.stdout.isTTY === 'boolean' ? process.stdout.isTTY : false;
}

export interface ParsedArgv {
  readonly command: string | undefined;
  readonly args: readonly string[];
  readonly options: Readonly<Record<string, string | boolean>>;
}

const BOOLEAN_FLAGS = new Set(['dry-run', 'verbose', 'debug', 'json', 'interactive']);
const SHORT_ALIASES: Readonly<Record<string, string>> = {
  v: 'version',
  h: 'help',
};

export function parseArgs(argv: readonly string[]): ParsedArgv {
  const options: Record<string, string | boolean> = {};
  const args: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === undefined) {
      i++;
      continue;
    }

    if (arg === '--') {
      args.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const equalsIndex = body.indexOf('=');
      if (equalsIndex !== -1) {
        options[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      } else if (BOOLEAN_FLAGS.has(body)) {
        options[body] = true;
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          options[body] = next;
          i++;
        } else {
          options[body] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      for (const char of arg.slice(1)) {
        options[SHORT_ALIASES[char] ?? char] = true;
      }
    } else {
      args.push(arg);
    }

    i++;
  }

  return {
    command: args.length > 0 ? args[0] : undefined,
    args: args.slice(1),
    options,
  };
}

const VERSION = '0.0.0';

function printHelp(json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          usage: 'simplify <command> [args] [options]',
          globalOptions: [
            { name: '--version, -v', description: 'Print version.' },
            { name: '--help, -h', description: 'Print help.' },
            { name: '--dry-run', description: 'Show what would happen without making changes.' },
            { name: '--verbose', description: 'Verbose output.' },
            { name: '--debug', description: 'Debug output.' },
            { name: '--json', description: 'Machine-readable JSON output.' },
            { name: '--interactive', description: 'Force interactive mode.' },
          ],
          commands: commands.map((command) => ({
            name: command.name,
            description: command.description,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('simplify <command> [args] [options]');
  console.log('');
  console.log('Global options:');
  console.log('  --version, -v   Print version.');
  console.log('  --help, -h      Print help.');
  console.log('  --dry-run       Show what would happen without making changes.');
  console.log('  --verbose       Verbose output.');
  console.log('  --debug         Debug output.');
  console.log('  --json          Machine-readable JSON output.');
  console.log('  --interactive   Force interactive mode.');
  console.log('');
  console.log('Commands:');
  for (const command of commands) {
    console.log(`  ${command.name.padEnd(14)} ${command.description}`);
  }
}

function printCommandHelp(commandName: string, json: boolean): void {
  const command = getCommand(commandName);
  if (!command) {
    error(`Unknown command: "${commandName}".`, json);
    printHelp(json);
    return;
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          command: commandName,
          description: command.description,
          options: command.options,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`simplify ${commandName}`);
  console.log('');
  console.log(command.description);
  if (command.options.length > 0) {
    console.log('');
    console.log('Options:');
    for (const option of command.options) {
      console.log(`  --${option.name.padEnd(16)} ${option.description}`);
    }
  }
}

async function run(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const json = parsed.options.json === true;
  const dryRun = parsed.options['dry-run'] === true;
  const verbose = parsed.options.verbose === true;
  const debug = parsed.options.debug === true;
  const interactive = parsed.options.interactive === true;

  if (parsed.command === undefined) {
    if (parsed.options.version === true || parsed.options.v === true) {
      success(`simplify ${VERSION}`, json);
      return 0;
    }
    if (parsed.options.help === true || parsed.options.h === true) {
      printHelp(json);
      return 0;
    }
    printHelp(json);
    return 2;
  }

  if (parsed.options.help === true || parsed.options.h === true) {
    printCommandHelp(parsed.command, json);
    return 0;
  }

  const command = getCommand(parsed.command);
  if (!command) {
    error(`Unknown command: "${parsed.command}".`, json);
    printHelp(json);
    return 2;
  }

  try {
    await command.handler({
      args: parsed.args,
      options: parsed.options,
      dryRun,
      verbose,
      debug,
      json,
      interactive: isInteractive(interactive),
    });
    return 0;
  } catch (err) {
    if (err instanceof CliError) {
      error(err.message, json);
      return 1;
    }
    if (err instanceof Error) {
      error(err.message, json);
      return 1;
    }
    error(String(err), json);
    return 1;
  }
}

const isMain = process.argv[1] !== undefined && process.argv[1].toString().endsWith('cli.js');

if (isMain) {
  void run(process.argv.slice(2)).then(
    (code: number) => {
      process.exitCode = code;
    },
    () => {
      process.exitCode = 1;
    },
  );
}

export { commands, getCommand };
export { run };
