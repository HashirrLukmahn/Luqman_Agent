// Workaround for @google/adk-devtools@1.0.0 dev-ui 404.
// The bundled adk_api_server.js does path.join(__dirname, "./browser") which
// resolves to dist/{cjs,esm}/server/browser/ — but the static files live at
// dist/{cjs,esm}/browser/ (one level up). Create the missing symlink so
// express.static can find them.
import { existsSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

const pkg = "node_modules/@google/adk-devtools/dist";
for (const mod of ["cjs", "esm"]) {
  const target = resolve(pkg, mod, "server", "browser");
  if (existsSync(target)) continue;
  try {
    symlinkSync("../browser", target, "dir");
    console.log(`[fix-adk-devui] linked ${target} -> ../browser`);
  } catch (err) {
    console.error(`[fix-adk-devui] could not link ${target}:`, err.message);
  }
}
