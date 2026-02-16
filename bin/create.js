import { execSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeRegistryExports } from "./generate-registry-exports.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_TEMPLATE_URL =
  "https://github.com/SpyC0der77/registry-template.git";

export async function create({
  projectLocation,
  registryName,
  styleName,
  homepage,
}) {
  const targetPath = resolve(process.cwd(), projectLocation);

  try {
    execSync(`git clone ${REGISTRY_TEMPLATE_URL} "${targetPath}"`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to clone registry template:", error.message);
    process.exit(1);
  }

  const registryPath = join(targetPath, "registry");
  const newYorkPath = join(registryPath, "new-york");
  const stylePath = join(registryPath, styleName);

  if (styleName !== "new-york" && existsSync(newYorkPath)) {
    renameSync(newYorkPath, stylePath);
  }

  const templatePath = join(__dirname, "templates", "registry.json");
  const registryJsonPath = join(targetPath, "registry.json");

  let registryContent = readFileSync(templatePath, "utf-8");
  registryContent = registryContent
    .replace(/\{\{REGISTRY_NAME\}\}/g, registryName)
    .replace(/\{\{HOMEPAGE\}\}/g, homepage)
    .replace(/\{\{STYLE_NAME\}\}/g, styleName);

  writeFileSync(registryJsonPath, registryContent);

  writeRegistryExports(targetPath);

  const pageTemplatePath = join(__dirname, "templates", "page.tsx");
  const appPagePath = join(targetPath, "app", "page.tsx");
  const pageContent = readFileSync(pageTemplatePath, "utf-8");
  writeFileSync(appPagePath, pageContent);

  return { targetPath, registryName, styleName, homepage };
}
