// Workaround for @google/adk-devtools@1.0.0 dev-ui 404.
// The bundled cli_entrypoint.mjs defines __dirname as the directory of
// cli_entrypoint.mjs itself (i.e. dist/), then does
// path.join(__dirname, "./browser") to mount express.static for /dev-ui.
// That resolves to dist/browser/ — which doesn't exist. The actual UI
// assets live at dist/cjs/browser/ (and dist/esm/browser/). Symlink
// dist/browser -> cjs/browser so the static handler finds the files.
import { existsSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

const dist = "node_modules/@google/adk-devtools/dist";
const target = resolve(dist, "browser");
if (!existsSync(target)) {
  try {
    symlinkSync("cjs/browser", target, "dir");
    console.log(`[fix-adk-devui] linked ${target} -> cjs/browser`);
  } catch (err) {
    console.error(`[fix-adk-devui] could not link ${target}:`, err.message);
  }
}
