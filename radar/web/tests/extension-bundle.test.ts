import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// La extensión se carga sin compilar: sus archivos generados deben estar al día
// con el código fuente (npm run build:extension).
const web = path.resolve(__dirname, "..");
const out = path.resolve(web, "../extension/src");
const common = {
  bundle: true,
  format: "iife" as const,
  target: ["chrome111"],
  legalComments: "none" as const,
  charset: "utf8" as const,
  write: false,
  banner: { js: "// Archivo generado por radar/web/scripts/build-extension.mjs — no editar a mano." },
};

describe("extensión compilada", () => {
  it.each([
    ["src/ext/index.ts", "core.js", "CifraCore"],
    ["src/ext/app.ts", "app.js", undefined],
  ])("%s está al día en %s", async (entry, file, globalName) => {
    const r = await build({ ...common, entryPoints: [path.join(web, entry)], globalName, outfile: path.join(out, file) });
    const fresh = r.outputFiles?.[0]?.text ?? "";
    expect(readFileSync(path.join(out, file), "utf8"), "Ejecuta: npm run build:extension").toBe(fresh);
  });
});
