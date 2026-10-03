// GitHub Pages post-build: the prerendered HTML links the stylesheet under the
// SSR build's hash, which is never emitted. Point every page at the client's
// stylesheet so the first paint is styled.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "dist/client";
const assetsDir = join(outDir, "assets");
const clientCss = readdirSync(assetsDir).filter((f) => /^styles-.*\.css$/.test(f));
if (clientCss.length !== 1) {
  throw new Error(`expected one client stylesheet, found: ${clientCss.join(", ") || "none"}`);
}
const css = clientCss[0];

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith(".html") ? [full] : [];
  });
}

let fixed = 0;
for (const file of htmlFiles(outDir)) {
  const html = readFileSync(file, "utf8");
  const next = html.replace(/assets\/(styles-[^"'/]+\.css)/g, (match, name) =>
    existsSync(join(assetsDir, name)) ? match : `assets/${css}`,
  );
  if (next !== html) {
    writeFileSync(file, next);
    fixed++;
  }
}
console.log(`[pages-postbuild] linked ${css} in ${fixed} page(s)`);
