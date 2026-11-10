export interface CommandOption {
  readonly name: string;
  readonly alias?: string;
  readonly type: 'boolean' | 'string';
  readonly description: string;
}

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly options: readonly CommandOption[];
  handler: (context: CommandContext) => Promise<void>;
}

import type { CommandContext } from '../cli.js';
import { addCommand } from './add.js';
import { doctorCommand } from './doctor.js';
import { infoCommand } from './info.js';
import { initCommand } from './init.js';
import { listCommand } from './list.js';

export { addCommand, doctorCommand, infoCommand, initCommand, listCommand };

export const commands: readonly Command[] = [
  initCommand,
  addCommand,
  infoCommand,
  listCommand,
  doctorCommand,
];

export function getCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name);
}
