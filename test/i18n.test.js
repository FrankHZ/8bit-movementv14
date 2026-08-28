import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const languageRoot = join(repositoryRoot, "src", "lang");

function placeholders(value) {
  return [...String(value).matchAll(/\{[^{}]+\}/g)]
    .map(([placeholder]) => placeholder)
    .sort();
}

test("locales match the English keys and placeholders", async () => {
  const files = (await readdir(languageRoot))
    .filter((file) => extname(file) === ".json")
    .sort();
  assert.ok(files.includes("en.json"), "Missing base locale: en.json");

  const locales = new Map();
  for (const file of files) {
    const translations = JSON.parse(
      await readFile(join(languageRoot, file), "utf8"),
    );
    locales.set(file, translations);
  }

  const english = locales.get("en.json");
  const englishKeys = Object.keys(english).sort();
  for (const [file, translations] of locales) {
    assert.deepEqual(
      Object.keys(translations).sort(),
      englishKeys,
      `${file} must contain exactly the same keys as en.json`,
    );

    for (const key of englishKeys) {
      assert.equal(
        typeof translations[key],
        "string",
        `${file}: ${key} must be a string`,
      );
      assert.notEqual(
        translations[key].trim(),
        "",
        `${file}: ${key} must not be empty`,
      );
      assert.deepEqual(
        placeholders(translations[key]),
        placeholders(english[key]),
        `${file} must preserve placeholders for ${key}`,
      );
    }
  }
});
