import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Command } from './index.js';
import { info, CliError } from '../cli.js';
import type {
  AssetCategory,
  AssetManifest,
  AssetStatus,
  ImplementationTarget,
  RuntimeCapability,
} from '@simplify-dev/schemas';
import { validateAssetManifest, validateLibraryManifest } from '@simplify-dev/registry';

const ASSET_CATEGORIES: readonly AssetCategory[] = [
  'ui',
  'blocks',
  'logic',
  'integrations',
  'recipes',
  'templates',
];

const DEFAULT_VERSION = '0.1.0';
const DEFAULT_STATUS: AssetStatus = 'community';
const LIBRARY_MANIFEST_PATH = 'simplify/library.json';

interface LibraryManifestShape {
  readonly id: string;
  readonly assets?: readonly string[];
  readonly license?: string;
}

interface ResolvedOptions {
  readonly category: AssetCategory;
  readonly name: string;
  readonly assetId: string;
  readonly targetDir: string;
  readonly dryRun: boolean;
  readonly json: boolean;
}

interface CategoryDefaults {
  readonly language: string;
  readonly framework?: string;
  readonly runtime?: RuntimeCapability;
  readonly extension: 'ts' | 'tsx';
}

const CATEGORY_DEFAULTS: ReadonlyMap<AssetCategory, CategoryDefaults> = new Map([
  ['ui', { language: 'typescript', framework: 'react', runtime: 'browser', extension: 'tsx' }],
  ['blocks', { language: 'typescript', framework: 'react', extension: 'tsx' }],
  ['logic', { language: 'typescript', extension: 'ts' }],
  ['integrations', { language: 'typescript', runtime: 'node', extension: 'ts' }],
  ['recipes', { language: 'typescript', framework: 'react', extension: 'ts' }],
  ['templates', { language: 'typescript', framework: 'next.js', extension: 'ts' }],
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function toFunctionName(value: string): string {
  return value
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function toComponentName(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function isAssetCategory(value: string): value is AssetCategory {
  return ASSET_CATEGORIES.includes(value as AssetCategory);
}

function resolveOptions(context: {
  readonly options: Readonly<Record<string, string | boolean>>;
}): ResolvedOptions {
  const options = context.options;

  if (typeof options.category !== 'string' || !isAssetCategory(options.category)) {
    throw new CliError(
      `Missing or invalid required option: --category (${ASSET_CATEGORIES.join(', ')}).`,
      'INVALID_CATEGORY',
    );
  }

  const category = options.category;

  if (typeof options.name !== 'string' || options.name.length === 0) {
    throw new CliError('Missing required option: --name.', 'MISSING_OPTION');
  }
  const name = options.name;

  let assetId: string;
  if (typeof options['asset-id'] === 'string' && options['asset-id'].length > 0) {
    const provided = options['asset-id'];
    const expectedPrefix = `${category}/`;
    const suffix = provided.slice(expectedPrefix.length);
    if (
      !provided.startsWith(expectedPrefix) ||
      suffix.length === 0 ||
      !/^[a-z0-9][a-z0-9-]*$/.test(suffix)
    ) {
      throw new CliError(
        `--asset-id must be "${category}/<name>" (e.g. "${category}/button").`,
        'INVALID_ASSET_ID',
      );
    }
    assetId = provided;
  } else {
    const slug = slugify(name);
    if (slug.length === 0) {
      throw new CliError(
        `Unable to derive asset id from name "${name}". Provide --asset-id explicitly.`,
        'INVALID_ASSET_ID',
      );
    }
    assetId = `${category}/${slug}`;
  }

  const targetDir =
    typeof options['target-dir'] === 'string' && options['target-dir'].length > 0
      ? options['target-dir']
      : process.cwd();
  const dryRun = options['dry-run'] === true;
  const json = options.json === true;

  return { category, name, assetId, targetDir, dryRun, json };
}

function targetForCategory(category: AssetCategory): ImplementationTarget {
  const defaults = CATEGORY_DEFAULTS.get(category);
  if (defaults === undefined) {
    throw new CliError(`No scaffold defaults for category "${category}".`, 'INVALID_CATEGORY');
  }
  return {
    language: defaults.language,
    ...(defaults.framework !== undefined ? { framework: defaults.framework } : {}),
    ...(defaults.runtime !== undefined ? { runtime: defaults.runtime } : {}),
  };
}

function implementationEntry(category: AssetCategory, slug: string): string {
  const extension = CATEGORY_DEFAULTS.get(category)!.extension;
  return `src/${slug}.${extension}`;
}

function testPath(entry: string): string {
  return entry.replace(/\.(ts|tsx)$/, '.test.$1');
}

function buildAssetManifest(options: ResolvedOptions, libraryLicense: string): AssetManifest {
  const slug = options.assetId.split('/')[1]!;
  const target = targetForCategory(options.category);
  const entry = implementationEntry(options.category, slug);
  const extension = CATEGORY_DEFAULTS.get(options.category)!.extension;

  const assetManifest: AssetManifest = {
    schemaVersion: 1,
    id: options.assetId,
    category: options.category,
    name: options.name,
    description: `A ${options.name} ${options.category} asset.`,
    version: DEFAULT_VERSION,
    publisher: 'local-author',
    status: DEFAULT_STATUS,
    license: libraryLicense,
    targets: [target],
    implementations: [
      {
        id: 'main',
        target,
        mode: 'source',
        entry,
      },
    ],
    installation: {
      modes: [
        {
          mode: 'source',
          files: [{ source: entry, target: entry }],
        },
      ],
    },
    documentation: {
      readme: `docs/${slug}.md`,
      examples: [`examples/${slug}.example.${extension}`],
    },
    ...(options.category === 'ui'
      ? {
          preview: {
            entry: `previews/${slug}.preview.tsx`,
            scenarios: ['default'],
          },
          dependencies: {
            packages: [{ name: 'react', version: '^18.2.0', kind: 'peer' }],
          },
        }
      : {}),
  };

  return assetManifest;
}

function libraryAssetPath(category: AssetCategory, slug: string): string {
  return `simplify/assets/${category}/${slug}.json`;
}

function implementationContent(category: AssetCategory, slug: string): string {
  const defaults = CATEGORY_DEFAULTS.get(category)!;
  const isReact = defaults.framework === 'react' && defaults.extension === 'tsx';

  if (isReact) {
    const Component = toComponentName(slug);
    return `import type { ReactNode } from 'react';

interface ${Component}Props {
  readonly children?: ReactNode;
}

export function ${Component}(props: ${Component}Props): JSX.Element {
  return <div data-component="${slug}">{props.children}</div>;
}

export default ${Component};\n`;
  }

  const fn = toFunctionName(slug);
  return `export function ${fn}(): void {
  // Implement the ${slug} logic here.
}\n`;
}

function testContent(category: AssetCategory, slug: string): string {
  const defaults = CATEGORY_DEFAULTS.get(category)!;
  const isReact = defaults.framework === 'react';
  const entry = implementationEntry(category, slug);
  const modulePath = `./${entry.replace(/\.tsx$/, '').replace(/\.ts$/, '')}`;

  if (isReact) {
    const Component = toComponentName(slug);
    return `import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${Component} } from '${modulePath}';

describe('${slug}', () => {
  it('renders without crashing', () => {
    render(<${Component} />);
    expect(screen.getByTestId('data-component-${slug}')).toBeInTheDocument();
  });
});
`;
  }

  const fn = toFunctionName(slug);
  return `import { describe, expect, it } from 'vitest';
import { ${fn} } from '${modulePath}';

describe('${slug}', () => {
  it('is defined', () => {
    expect(${fn}).toBeDefined();
    expect(typeof ${fn}).toBe('function');
  });
});
`;
}

function docsContent(name: string, category: AssetCategory, slug: string): string {
  const entry = implementationEntry(category, slug);
  const fn = toFunctionName(slug);

  return `# ${name}

${name} is a \`${category}\` asset.

## Usage

Import and use the asset in your project:

\`\`\`ts
import { ${fn} } from '${entry.replace(/^src\//, '')}';
\`\`\`

## Implementation

The implementation lives at \`${entry}\`.

## Installation

This asset supports \`source\` installation. Register it in \`simplify/library.json\` and add it to your project with \`simplify add\`.
`;
}

function exampleContent(name: string, category: AssetCategory, slug: string): string {
  const extension = CATEGORY_DEFAULTS.get(category)!.extension;
  return `# Example — ${name}

Example usage of the \`${slug}\` \`${category}\` asset.

See \`examples/${slug}.example.${extension}\` for a runnable example.
`;
}

function previewContent(slug: string): string {
  return `import type { ReactNode } from 'react';

interface PreviewProps {
  readonly children?: ReactNode;
}

export function Preview(props: PreviewProps): JSX.Element {
  return <div data-preview="${slug}">{props.children}</div>;
}

export default Preview;\n`;
}

interface PlannedFile {
  readonly path: string;
  readonly content: string;
}

async function planFiles(
  options: ResolvedOptions,
  libraryLicense: string,
): Promise<{ files: readonly PlannedFile[]; assetManifest: AssetManifest }> {
  const slug = options.assetId.split('/')[1]!;
  const assetManifest = buildAssetManifest(options, libraryLicense);
  const entry = implementationEntry(options.category, slug);
  const extension = CATEGORY_DEFAULTS.get(options.category)!.extension;

  const files: PlannedFile[] = [
    {
      path: join(options.targetDir, libraryAssetPath(options.category, slug)),
      content: `${JSON.stringify(assetManifest, null, 2)}\n`,
    },
    {
      path: join(options.targetDir, entry),
      content: implementationContent(options.category, slug),
    },
    {
      path: join(options.targetDir, testPath(entry)),
      content: testContent(options.category, slug),
    },
    {
      path: join(options.targetDir, `docs/${slug}.md`),
      content: docsContent(options.name, options.category, slug),
    },
    {
      path: join(options.targetDir, `examples/${slug}.example.${extension}`),
      content: exampleContent(options.name, options.category, slug),
    },
  ];

  if (options.category === 'ui') {
    files.push({
      path: join(options.targetDir, `previews/${slug}.preview.tsx`),
      content: previewContent(slug),
    });
  }

  return { files, assetManifest };
}

async function ensureWritable(filePaths: readonly string[]): Promise<void> {
  const existing: string[] = [];
  for (const filePath of filePaths) {
    try {
      await fs.access(filePath);
      existing.push(filePath);
    } catch {
      // Not present — safe to write.
    }
  }

  if (existing.length > 0) {
    throw new CliError(
      `Refusing to overwrite existing files:\n  ${existing.join('\n  ')}`,
      'FILE_EXISTS',
    );
  }
}

async function writeFileIfNeeded(filePath: string, content: string, json: boolean): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { flag: 'wx' });
  info(`Created ${filePath}.`, json);
}

export const assetCreateCommand: Command = {
  name: 'asset-create',
  description: 'Generate an asset manifest and scaffolding for an existing simplify.dev library.',
  options: [
    {
      name: 'category',
      type: 'string',
      description: `Asset category (${ASSET_CATEGORIES.join(', ')}).`,
    },
    {
      name: 'name',
      type: 'string',
      description: 'Asset display name.',
    },
    {
      name: 'asset-id',
      type: 'string',
      description: `Full asset id (defaults to \`<category>/<name-slug>\`).`,
    },
    {
      name: 'target-dir',
      type: 'string',
      description: 'Target directory (defaults to the current working directory).',
    },
    {
      name: 'dry-run',
      type: 'boolean',
      description: 'Show what would happen without making changes.',
    },
  ],
  handler: async (context) => {
    const { dryRun, json } = context;
    const options = resolveOptions(context);

    const libraryPath = join(options.targetDir, LIBRARY_MANIFEST_PATH);
    let libraryRaw: string;
    try {
      libraryRaw = await fs.readFile(libraryPath, 'utf8');
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new CliError(
          `No simplify.dev library found at ${libraryPath}. Run \`simplify library-init\` first.`,
          'LIBRARY_NOT_FOUND',
        );
      }
      throw new CliError(
        `Failed to read ${libraryPath}: ${nodeError.message}`,
        'LIBRARY_READ_FAILED',
      );
    }

    let library: LibraryManifestShape;
    try {
      library = JSON.parse(libraryRaw) as LibraryManifestShape;
    } catch {
      throw new CliError(`${libraryPath} is not valid JSON.`, 'INVALID_LIBRARY_MANIFEST');
    }

    const libraryValidation = validateLibraryManifest(library);
    if (!libraryValidation.valid) {
      const issues = libraryValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Library manifest is invalid:\n${issues}`, 'INVALID_LIBRARY_MANIFEST');
    }

    const libraryLicense =
      typeof library.license === 'string' && library.license.length > 0 ? library.license : 'MIT';

    const slug = options.assetId.split('/')[1]!;
    const manifestPath = join(options.targetDir, libraryAssetPath(options.category, slug));
    const entry = implementationEntry(options.category, slug);
    const extension = CATEGORY_DEFAULTS.get(options.category)!.extension;

    const planned = await planFiles(options, libraryLicense);
    const existingChecks = [
      manifestPath,
      join(options.targetDir, entry),
      join(options.targetDir, testPath(entry)),
      join(options.targetDir, `docs/${slug}.md`),
      join(options.targetDir, `examples/${slug}.example.${extension}`),
      ...(options.category === 'ui'
        ? [join(options.targetDir, `previews/${slug}.preview.tsx`)]
        : []),
    ];

    if (dryRun) {
      info(
        `[dry-run] Would create asset "${options.assetId}" in library "${libraryValidation.value!.id}".`,
        json,
      );
      for (const file of planned.files) {
        info(`[dry-run] Would create ${file.path}.`, json);
      }
      info(
        `[dry-run] Would update ${libraryPath} to reference asset manifest ${libraryAssetPath(options.category, slug)}.`,
        json,
      );
      info('Dry-run complete. No changes were made.', json);
      return;
    }

    await ensureWritable(existingChecks);

    const assetValidation = validateAssetManifest(planned.assetManifest);
    if (!assetValidation.valid) {
      const issues = assetValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Generated asset manifest is invalid:\n${issues}`, 'INVALID_MANIFEST');
    }

    for (const file of planned.files) {
      await writeFileIfNeeded(file.path, file.content, json);
    }

    const assetRelativePath = libraryAssetPath(options.category, slug);
    const assets = library.assets ?? [];
    const nextLibrary: LibraryManifestShape = {
      ...library,
      assets: [...assets, assetRelativePath],
    };

    const nextValidation = validateLibraryManifest(nextLibrary);
    if (!nextValidation.valid) {
      const issues = nextValidation.issues
        .map((issue) => `  - ${issue.path}: ${issue.message} (${issue.keyword})`)
        .join('\n');
      throw new CliError(`Updated library manifest is invalid:\n${issues}`, 'INVALID_MANIFEST');
    }

    await fs.mkdir(dirname(libraryPath), { recursive: true });
    await fs.writeFile(libraryPath, `${JSON.stringify(nextLibrary, null, 2)}\n`);
    info(`Updated ${libraryPath}.`, json);

    info(`Asset "${options.assetId}" created.`, json);
    info(`Added ${assetRelativePath} to library manifest assets.`, json);
  },
};
