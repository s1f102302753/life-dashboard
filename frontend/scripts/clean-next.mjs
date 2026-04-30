import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), process.env.NEXT_DIST_DIR ?? ".next");
const fallbackBuildManifestPath = join(nextDir, "fallback-build-manifest.json");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed stale .next cache");
}

mkdirSync(nextDir, { recursive: true });
writeFileSync(
  fallbackBuildManifestPath,
  JSON.stringify(
    {
      polyfillFiles: ["static/chunks/polyfills.js"],
      devFiles: ["static/chunks/react-refresh.js"],
      ampDevFiles: [],
      lowPriorityFiles: [
        "static/development/_buildManifest.js",
        "static/development/_ssgManifest.js"
      ],
      rootMainFiles: ["static/chunks/webpack.js", "static/chunks/main.js"],
      pages: {
        "/_app": [
          "static/chunks/webpack.js",
          "static/chunks/main.js",
          "static/chunks/pages/_app.js"
        ],
        "/_error": [
          "static/chunks/webpack.js",
          "static/chunks/main.js",
          "static/chunks/pages/_error.js"
        ]
      },
      ampFirstPages: []
    },
    null,
    2
  )
);
console.log("Prepared fallback-build-manifest.json");
