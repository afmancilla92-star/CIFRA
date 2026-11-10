// Compila la lógica compartida y el explorador local para la extensión.
// Uso: npm run build:extension  (genera radar/extension/src/core.js y app.js)
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..");
const out = path.resolve(web, "../extension/src");

const common = {
  bundle: true,
  format: "iife",
  target: ["chrome111"],
  legalComments: "none",
  charset: "utf8",
  logLevel: "warning",
  banner: { js: "// Archivo generado por radar/web/scripts/build-extension.mjs — no editar a mano." },
};

await build({ ...common, entryPoints: [path.join(web, "src/ext/index.ts")], globalName: "CifraCore", outfile: path.join(out, "core.js") });
await build({ ...common, entryPoints: [path.join(web, "src/ext/app.ts")], outfile: path.join(out, "app.js") });
console.log("Extensión compilada en", out);
