import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(packageRoot, 'src');
const distRoot = path.join(packageRoot, 'dist');
const cssModuleSuffix = '.module.css';
// Longest suffixes first so `x.d.ts.map` is not mistaken for `x.js.map`.
const generatedSuffixes = ['.js.map', '.d.ts.map', '.js', '.d.ts'];

async function findCssModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findCssModules(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(cssModuleSuffix)) {
      found.push(entryPath);
    }
  }
  return found;
}

async function removeStaleCssModules(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeStaleCssModules(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(cssModuleSuffix)) {
      await rm(entryPath);
    }
  }
}

/**
 * Remove compiled JS and declaration artifacts whose source file was deleted.
 * `tsc` cannot clean its own outputs, so stale modules survive rebuilds.
 */
export async function removeStaleGeneratedOutputs(sourceRoot, outputRoot, baseOutput = outputRoot) {
  let entries;
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const entryPath = path.join(outputRoot, entry.name);
    if (entry.isDirectory()) {
      await removeStaleGeneratedOutputs(sourceRoot, entryPath, baseOutput);
      continue;
    }
    if (!entry.isFile()) continue;
    const suffix = generatedSuffixes.find((candidate) => entry.name.endsWith(candidate));
    if (!suffix) continue;
    const relativeBase = path.relative(baseOutput, entryPath).slice(0, -suffix.length);
    const hasSource = ['.ts', '.tsx'].some((extension) =>
      existsSync(path.join(sourceRoot, `${relativeBase}${extension}`)),
    );
    const hasIndexSource =
      existsSync(path.join(sourceRoot, relativeBase, 'index.ts')) ||
      existsSync(path.join(sourceRoot, relativeBase, 'index.tsx'));
    if (!hasSource && !hasIndexSource) {
      await rm(entryPath);
    }
  }
}

async function main() {
  const sources = await findCssModules(srcRoot);
  await removeStaleCssModules(distRoot);
  await removeStaleGeneratedOutputs(srcRoot, distRoot);
  for (const source of sources) {
    const target = path.join(distRoot, path.relative(srcRoot, source));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  console.log(`Copied ${sources.length} CSS module(s) into dist.`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
