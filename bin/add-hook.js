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
  mkdirSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { parseArgs } from "./parse-args.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

function toHookFunctionName(str) {
  // use-my-hook -> useMyHook
  return str
    .split("-")
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join("");
}

function validateHookName(value) {
  if (value.length === 0) return "Hook name is required!";
  if (!/^use-[a-z][a-z0-9-]*[a-z0-9]?$/.test(value))
    return "Use use-<name> format (e.g. use-my-hook)";
  return undefined;
}

const HOOK_TEMPLATE = `"use client"

import * as React from "react"

export function {{HOOK_NAME}}(options?: { defaultValue?: boolean }) {
  const [value, setValue] = React.useState(options?.defaultValue ?? false)

  const toggle = React.useCallback(() => {
    setValue((v) => !v)
  }, [])

  return { value, setValue, toggle }
}
`;

const { flags } = parseArgs();

intro("add-hook — Add a hook to your registry");

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

let hookName;
if (flags["hook-name"] != null) {
  hookName = flags["hook-name"];
  const err = validateHookName(hookName);
  if (err) {
    console.error(`Error: ${err}`);
    process.exit(1);
  }
} else {
  hookName = await text({
    message: "Hook name (use-<name>)?",
    placeholder: "use-my-hook",
    validate: validateHookName,
  });
  handleCancel(hookName);
}

let styleName;
if (flags.style != null) {
  styleName = flags.style;
  if (!["new-york", "default"].includes(styleName)) {
    console.error(`Error: --style must be "new-york" or "default"`);
    process.exit(1);
  }
} else {
  styleName = await select({
    message: "Which style?",
    options: [
      { value: "new-york", label: "New York" },
      { value: "default", label: "Default" },
    ],
  });
  handleCancel(styleName);
}

const registryPath = resolve(process.cwd(), registryFolder);
const registryJsonPath = join(registryPath, "registry.json");
if (!existsSync(registryJsonPath)) {
  console.error("Error: registry.json not found");
  process.exit(1);
}

const registry = JSON.parse(readFileSync(registryJsonPath, "utf-8"));
registry.items = registry.items || [];
if (registry.items.some((i) => i.name === hookName)) {
  console.error(
    `Error: Hook "${hookName}" already exists in registry. Remove it first or choose a different name.`,
  );
  process.exit(1);
}

const hookDir = join(registryPath, "registry", styleName, "hooks");
const hookFilePath = join(hookDir, `${hookName}.ts`);

if (existsSync(hookFilePath)) {
  cancel(`Hook already exists at ${hookFilePath}`);
  process.exit(1);
}

const filePath = `registry/${styleName}/hooks/${hookName}.ts`;

const DEFAULT_DEPS = [];
let dependencies = [...DEFAULT_DEPS];
if (
  typeof flags.dependencies === "string" &&
  flags.dependencies.trim() !== ""
) {
  const extra = flags.dependencies
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  dependencies = [...new Set([...DEFAULT_DEPS, ...extra])];
}

const newItem = {
  name: hookName,
  type: "registry:hook",
  dependencies,
  registryDependencies: [],
  files: [
    {
      path: filePath,
      type: "registry:hook",
    },
  ],
};

registry.items.push(newItem);
writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

const hookDirExisted = existsSync(hookDir);

try {
  const hookFunctionName = toHookFunctionName(hookName);
  const hookContent = HOOK_TEMPLATE.replace(
    /\{\{HOOK_NAME\}\}/g,
    hookFunctionName,
  );
  mkdirSync(hookDir, { recursive: true });
  writeFileSync(hookFilePath, hookContent);
} catch (err) {
  if (existsSync(hookFilePath)) unlinkSync(hookFilePath);
  try {
    if (!hookDirExisted && existsSync(hookDir)) rmdirSync(hookDir);
  } catch {
    /* dir may not be empty or already removed */
  }
  registry.items = registry.items.filter((i) => i.name !== hookName);
  writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));
  throw err;
}

outro(`Added ${hookName} at ${filePath}. Run \`registry:build\` to rebuild.`);
