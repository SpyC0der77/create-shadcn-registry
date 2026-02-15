#!/usr/bin/env node

import {
  intro,
  outro,
  text,
  select,
  isCancel,
  cancel,
} from "@clack/prompts";
import { resolve, join, dirname } from "node:path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  rmSync,
} from "node:fs";
import { parseArgs } from "./parse-args.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

const { flags } = parseArgs();

intro("remove-block — Remove a block from your registry");

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
const blocks = items.filter((i) => i.type === "registry:block");

if (blocks.length === 0) {
  cancel("No blocks in registry.");
  process.exit(1);
}

let blockName;
if (flags.block != null) {
  blockName = flags.block;
  const found = blocks.find((i) => i.name === blockName);
  if (!found) {
    console.error(
      `Error: Block "${blockName}" not found. Available: ${blocks.map((i) => i.name).join(", ")}`,
    );
    process.exit(1);
  }
} else {
  blockName = await select({
    message: "Which block to remove?",
    options: blocks.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  });
  handleCancel(blockName);
}

const item = items.find((i) => i.name === blockName);
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

// Remove empty block directory (derive path from first file: registry/<style>/blocks/<name>/)
const firstFile = files[0];
if (firstFile?.path) {
  const dir = join(registryPath, dirname(firstFile.path));
  if (existsSync(dir)) {
    try {
      rmSync(dir, { recursive: true });
    } catch {
      /* dir may not be empty or already removed */
    }
  }
}

registry.items = items.filter((i) => i.name !== blockName);
writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

outro(`Removed ${blockName}. Run \`registry:build\` to rebuild.`);
