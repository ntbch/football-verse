import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const testFiles = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (/\.test\.ts$/.test(entry.name)) testFiles.push(relative(process.cwd(), path));
  }
}

for (const root of ["src", "tests"]) {
  if (statSync(root, { throwIfNoEntry: false })?.isDirectory()) collect(root);
}

testFiles.sort();
if (!testFiles.length) {
  console.error("No Web test files found.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "--experimental-strip-types", ...testFiles], { stdio: "inherit" });
process.exit(result.status ?? 1);
