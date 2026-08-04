import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const buildDir = new URL("../apps/web/.next/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("app-build-manifest.json", buildDir)));
const routes = {
  "/page": { js: 170_000, css: 20_000 },
  "/news/page": { js: 170_000, css: 20_000 },
  "/news/[slug]/page": { js: 170_000, css: 20_000 },
  "/forum/page": { js: 170_000, css: 20_000 },
  "/games/page": { js: 170_000, css: 21_000 },
  "/admin/page": { js: 160_000, css: 20_000 },
};

const bytesFor = (files, extension) => [...new Set(files.filter((file) => file.endsWith(extension)))].reduce(
  (total, file) => total + gzipSync(readFileSync(new URL(file, buildDir))).length,
  0,
);

const failures = [];
for (const [route, budget] of Object.entries(routes)) {
  const files = [
    ...(manifest.pages["/layout"] ?? []),
    ...((budget.layouts ?? []).flatMap((layout) => manifest.pages[layout] ?? [])),
    ...(manifest.pages[route] ?? []),
  ];
  for (const [extension, limit] of [[".js", budget.js], [".css", budget.css]]) {
    const bytes = bytesFor(files, extension);
    const label = extension.slice(1).toUpperCase();
    console.log(`${route} ${label}: ${(bytes / 1024).toFixed(1)} KiB gzip (budget ${(limit / 1024).toFixed(1)} KiB)`);
    if (bytes > limit) failures.push(`${route} ${label} is ${(bytes / 1024).toFixed(1)} KiB; limit ${(limit / 1024).toFixed(1)} KiB`);
  }
}

if (failures.length) throw new Error(`Web performance budget exceeded:\n${failures.join("\n")}`);
