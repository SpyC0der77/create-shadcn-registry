#!/usr/bin/env node

import {
  intro,
  outro,
  text,
  select,
  isCancel,
  cancel,
} from "@clack/prompts";
import { resolve, join } from "node:path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { parseArgs } from "./parse-args.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

const { flags } = parseArgs();

intro("remove-component — Remove a component from your registry");

let registryFolder;
if (flags["registry-folder"] != null) {
  registryFolder = flags["registry-folder"];
} else {
  registryFolder = await text({
    message: "Folder containing the registry?",
    placeholder: ".",
    validate(value) {
      const p = resolve(process.cwd(), value);
      if (!existsSync(join(p, "registry.json"))) {
        return "registry.json not found in that folder";
      }
    },
  });
  handleCancel(registryFolder);
}

const registryPath = resolve(process.cwd(), registryFolder);
const registryJsonPath = join(registryPath, "registry.json");
const registry = JSON.parse(readFileSync(registryJsonPath, "utf-8"));
const items = registry.items || [];

if (items.length === 0) {
  cancel("No components in registry.");
  process.exit(1);
}

let componentName;
if (flags.component != null) {
  componentName = flags.component;
  const found = items.find((i) => i.name === componentName);
  if (!found) {
    console.error(
      `Error: Component "${componentName}" not found. Available: ${items.map((i) => i.name).join(", ")}`,
    );
    process.exit(1);
  }
} else {
  componentName = await select({
    message: "Which component to remove?",
    options: items.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  });
  handleCancel(componentName);
}

const item = items.find((i) => i.name === componentName);
const files = item?.files || [];

for (const file of files) {
  const filePath = join(registryPath, file.path);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (err) {
      console.warn(`Could not delete ${file.path}:`, err.message);
    }
  }
}

registry.items = items.filter((i) => i.name !== componentName);
writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

outro(`Removed ${componentName}. Run \`registry:build\` to rebuild.`);
