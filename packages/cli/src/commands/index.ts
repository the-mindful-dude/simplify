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
import { assetCreateCommand } from './asset-create.js';
import { assetValidateCommand } from './asset-validate.js';
import { doctorCommand } from './doctor.js';
import { infoCommand } from './info.js';
import { initCommand } from './init.js';
import { libraryBuildCommand } from './library-build.js';
import { libraryConnectCommand } from './library-connect.js';
import { libraryCreateCommand } from './library-create.js';
import { libraryDisconnectCommand } from './library-disconnect.js';
import { libraryInitCommand } from './library-init.js';
import { libraryPublishCommand } from './library-publish.js';
import { libraryStatusCommand } from './library-status.js';
import { librarySyncCommand } from './library-sync.js';
import { libraryWorkflowCommand } from './library-workflow.js';
import { listCommand } from './list.js';

export {
  addCommand,
  assetCreateCommand,
  assetValidateCommand,
  doctorCommand,
  infoCommand,
  initCommand,
  libraryBuildCommand,
  libraryConnectCommand,
  libraryCreateCommand,
  libraryDisconnectCommand,
  libraryInitCommand,
  libraryPublishCommand,
  libraryStatusCommand,
  librarySyncCommand,
  libraryWorkflowCommand,
  listCommand,
};

export const commands: readonly Command[] = [
  initCommand,
  libraryInitCommand,
  libraryConnectCommand,
  libraryCreateCommand,
  libraryDisconnectCommand,
  libraryStatusCommand,
  librarySyncCommand,
  libraryPublishCommand,
  libraryWorkflowCommand,
  addCommand,
  assetCreateCommand,
  infoCommand,
  listCommand,
  doctorCommand,
  assetValidateCommand,
  libraryBuildCommand,
];

export function getCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name);
}
