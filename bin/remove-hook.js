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

intro("remove-hook — Remove a hook from your registry");

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
const hooks = items.filter((i) => i.type === "registry:hook");

if (hooks.length === 0) {
  cancel("No hooks in registry.");
  process.exit(1);
}

let hookName;
if (flags.hook != null) {
  hookName = flags.hook;
  const found = hooks.find((i) => i.name === hookName);
  if (!found) {
    console.error(
      `Error: Hook "${hookName}" not found. Available: ${hooks.map((i) => i.name).join(", ")}`,
    );
    process.exit(1);
  }
} else {
  hookName = await select({
    message: "Which hook to remove?",
    options: hooks.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  });
  handleCancel(hookName);
}

const item = items.find((i) => i.name === hookName);
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

registry.items = items.filter((i) => i.name !== hookName);
writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

outro(`Removed ${hookName}. Run \`registry:build\` to rebuild.`);
