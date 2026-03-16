import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const compile = spawnSync(
  process.execPath,
  ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.community-tests.json"],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const compiledTestPath = path.join(
  repoRoot,
  ".tmp",
  "community-tests",
  "scripts",
  "run-community-tests.js",
);

await import(pathToFileURL(compiledTestPath).href);
