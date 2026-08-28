import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function findFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findFiles(path, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      matches.push(path);
    }
  }
  return matches.sort();
}

function runNode(arguments_, label) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${label} failed with exit code ${result.status}`);
}

const scriptRoot = join(repositoryRoot, "src", "scripts");
const scriptFiles = await findFiles(scriptRoot, ".js");
for (const scriptFile of scriptFiles) {
  runNode(["--check", scriptFile], `Syntax check for ${scriptFile}`);
}

const packagePath = join(repositoryRoot, "package.json");
const manifestPath = join(repositoryRoot, "src", "module.json");
const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const languageRoot = join(repositoryRoot, "src", "lang");
const languageFiles = await findFiles(languageRoot, ".json");
for (const languageFile of languageFiles) {
  JSON.parse(await readFile(languageFile, "utf8"));
}

assert.equal(
  packageMetadata.version,
  manifest.version,
  "package.json and module.json versions must match",
);

for (const language of manifest.languages ?? []) {
  assert.match(language.lang, /^[a-z-]+$/, `Invalid language code: ${language.lang}`);
  await access(join(repositoryRoot, "src", language.path));
}

runNode(["--test"], "Unit tests");
console.log(
  `Checks passed: ${scriptFiles.length} scripts, ${languageFiles.length} locales, version ${manifest.version}.`,
);
