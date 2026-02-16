/**
 * Generates registry/exports.ts (barrel file) from registry.json.
 * Re-exports all UI components and blocks so the page can dynamically load them at request time.
 */

import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

function toPascalCase(str) {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * @param {string} registryPath - Absolute path to folder containing registry.json
 */
export function writeRegistryExports(registryPath) {
  const registryJsonPath = join(registryPath, "registry.json");
  if (!existsSync(registryJsonPath)) {
    throw new Error(`registry.json not found at ${registryJsonPath}`);
  }

  const registry = JSON.parse(readFileSync(registryJsonPath, "utf-8"));
  const items = registry.items || [];
  const renderableItems = items.filter(
    (i) => i.type === "registry:ui" || i.type === "registry:block"
  );

  const exportsDir = join(registryPath, "registry");
  mkdirSync(exportsDir, { recursive: true });
  const barrelPath = join(exportsDir, "exports.ts");

  if (renderableItems.length === 0) {
    writeFileSync(
      barrelPath,
      `// Auto-generated from registry.json - do not edit manually
export {}
`
    );
    return;
  }

  const exportLines = renderableItems.map((item) => {
    const firstFile = item.files?.[0];
    if (!firstFile?.path) return null;
    const componentName = toPascalCase(item.name);
    const relPath = firstFile.path
      .replace(/^registry\//, "")
      .replace(/\.(tsx?|jsx?)$/, "");
    return `export { ${componentName} } from "./${relPath}"`;
  }).filter(Boolean);

  const content = `// Auto-generated from registry.json - do not edit manually
${exportLines.join("\n")}
`;

  writeFileSync(barrelPath, content);
}
