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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { parseArgs } from "./parse-args.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

function toPascalCase(str) {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function validateBlockName(value) {
  if (value.length === 0) return "Block name is required!";
  if (!/^[a-z][a-z0-9-]*[a-z0-9]?$/.test(value))
    return "Use kebab-case (e.g. my-block)";
  return undefined;
}

const BLOCK_COMPONENT_TEMPLATE = `"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { use{{BLOCK_PASCAL}} } from "./use-{{BLOCK_NAME}}"

export function {{BLOCK_PASCAL}}({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { value, toggle } = use{{BLOCK_PASCAL}}()

  return (
    <div
      data-slot="{{BLOCK_NAME}}"
      className={cn("rounded-lg border p-4", className)}
      {...props}
    >
      <button
        type="button"
        onClick={toggle}
        className="text-sm font-medium"
      >
        Toggle: {value ? "ON" : "OFF"}
      </button>
    </div>
  )
}
`;

const BLOCK_HOOK_TEMPLATE = `"use client"

import * as React from "react"

export function use{{BLOCK_PASCAL}}() {
  const [value, setValue] = React.useState(false)

  const toggle = React.useCallback(() => {
    setValue((v) => !v)
  }, [])

  return { value, setValue, toggle }
}
`;

const { flags } = parseArgs();

intro("add-block — Add a block to your registry");

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

let blockName;
if (flags["block-name"] != null) {
  blockName = flags["block-name"];
  const err = validateBlockName(blockName);
  if (err) {
    console.error(`Error: ${err}`);
    process.exit(1);
  }
} else {
  blockName = await text({
    message: "Block name (kebab-case)?",
    placeholder: "my-block",
    validate: validateBlockName,
  });
  handleCancel(blockName);
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
if (registry.items.some((i) => i.name === blockName)) {
  console.error(
    `Error: Block "${blockName}" already exists in registry. Remove it first or choose a different name.`,
  );
  process.exit(1);
}

const blockDir = join(registryPath, "registry", styleName, "blocks", blockName);
const componentFilePath = join(blockDir, `${blockName}.tsx`);
const hookFilePath = join(blockDir, `use-${blockName}.ts`);

if (existsSync(componentFilePath)) {
  cancel(`Block already exists at ${blockDir}`);
  process.exit(1);
}

const pascalName = toPascalCase(blockName);
const blockComponentContent = BLOCK_COMPONENT_TEMPLATE.replace(
  /\{\{BLOCK_PASCAL\}\}/g,
  pascalName
).replace(/\{\{BLOCK_NAME\}\}/g, blockName);

const blockHookContent = BLOCK_HOOK_TEMPLATE.replace(
  /\{\{BLOCK_PASCAL\}\}/g,
  pascalName
);

mkdirSync(blockDir, { recursive: true });
writeFileSync(componentFilePath, blockComponentContent);
writeFileSync(hookFilePath, blockHookContent);

const componentPath = `registry/${styleName}/blocks/${blockName}/${blockName}.tsx`;
const hookPath = `registry/${styleName}/blocks/${blockName}/use-${blockName}.ts`;

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
  name: blockName,
  type: "registry:block",
  dependencies,
  registryDependencies: [],
  files: [
    {
      path: componentPath,
      type: "registry:component",
    },
    {
      path: hookPath,
      type: "registry:hook",
    },
  ],
};

registry.items.push(newItem);

writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

outro(
  `Added block ${blockName} at registry/${styleName}/blocks/${blockName}/. Run \`registry:build\` to rebuild.`
);
