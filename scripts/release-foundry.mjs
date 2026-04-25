import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_URL = "https://foundryvtt.com/_api/packages/release_version/";
const MODULE_MANIFEST = path.join("src", "module.json");
const TOKEN_ENV_KEY = "FOUNDRY_RELEASE_TOKEN";

function parseArgs(args) {
  return {
    dryRun: !args.includes("--publish"),
    payloadOnly: args.includes("--payload-only"),
    showPayload: args.includes("--show-payload") || args.includes("--payload-only"),
  };
}

async function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await readFile(file, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separator = trimmed.indexOf("=");
        if (separator === -1) continue;

        const key = trimmed.slice(0, separator).trim();
        const value = trimmed
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        if (key && process.env[key] === undefined) process.env[key] = value;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function getGitHubRepoUrl(moduleManifest) {
  const url = moduleManifest.url || moduleManifest.manifest || "";
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) {
    throw new Error(
      "Could not infer the GitHub repository from module.json url/manifest.",
    );
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

function buildReleasePayload(moduleManifest, dryRun) {
  const { owner, repo } = getGitHubRepoUrl(moduleManifest);
  const tag = `v${moduleManifest.version}`;

  return {
    id: moduleManifest.id,
    "dry-run": dryRun,
    release: {
      version: moduleManifest.version,
      manifest: `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/src/module.json`,
      notes: `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
      compatibility: {
        minimum: moduleManifest.compatibility?.minimum ?? "",
        verified: moduleManifest.compatibility?.verified ?? "",
        maximum: moduleManifest.compatibility?.maximum ?? "",
      },
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadLocalEnv();

  const moduleManifest = JSON.parse(await readFile(MODULE_MANIFEST, "utf8"));
  const payload = buildReleasePayload(moduleManifest, options.dryRun);

  if (options.showPayload) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (options.payloadOnly) return;

  const token = process.env[TOKEN_ENV_KEY];
  if (!token) {
    throw new Error(
      `Missing ${TOKEN_ENV_KEY}. Set it in your shell or in .env.local.`,
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = body;
  }

  if (!response.ok) {
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`Foundry release API failed with HTTP ${response.status}.`);
  }

  console.log(JSON.stringify(data, null, 2));
  console.log(
    options.dryRun
      ? "Dry run completed. Re-run with --publish to create the release."
      : "Release published.",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
