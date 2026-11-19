import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(packageRoot, 'src');
const distRoot = path.join(packageRoot, 'dist');
const cssModuleSuffix = '.module.css';

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

const sources = await findCssModules(srcRoot);
await removeStaleCssModules(distRoot);
for (const source of sources) {
  const target = path.join(distRoot, path.relative(srcRoot, source));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}
console.log(`Copied ${sources.length} CSS module(s) into dist.`);
