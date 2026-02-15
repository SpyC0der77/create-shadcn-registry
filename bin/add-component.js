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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./parse-args.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function validateComponentName(value) {
  if (value.length === 0) return "Component name is required!";
  if (!/^[a-z][a-z0-9-]*[a-z0-9]?$/.test(value))
    return "Use kebab-case (e.g. my-component)";
  return undefined;
}

const COMPONENT_TEMPLATE = `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const {{COMPONENT_NAME}}Variants = cva(
  "inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border border-input bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function {{COMPONENT_NAME}}({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof {{COMPONENT_NAME}}Variants>) {
  return (
    <div
      data-slot="{{SLOT_NAME}}"
      className={cn({{COMPONENT_NAME}}Variants({ variant, className }))}
      {...props}
    />
  )
}

export { {{COMPONENT_NAME}}, {{COMPONENT_NAME}}Variants }
`;

const { flags } = parseArgs();

intro("add-component — Add a component to your registry");

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

let componentName;
if (flags["component-name"] != null) {
  componentName = flags["component-name"];
  const err = validateComponentName(componentName);
  if (err) {
    console.error(`Error: ${err}`);
    process.exit(1);
  }
} else {
  componentName = await text({
    message: "Component name (kebab-case)?",
    placeholder: "my-component",
    validate: validateComponentName,
  });
  handleCancel(componentName);
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

const regPath = resolve(process.cwd(), registryFolder);
if (!existsSync(join(regPath, "registry.json"))) {
  console.error("Error: registry.json not found in that folder");
  process.exit(1);
}

const registryPath = resolve(process.cwd(), registryFolder);
const registryJsonPath = join(registryPath, "registry.json");
const componentDir = join(registryPath, "registry", styleName, "ui");
const componentFilePath = join(componentDir, `${componentName}.tsx`);

if (existsSync(componentFilePath)) {
  cancel(`Component already exists at ${componentFilePath}`);
  process.exit(1);
}

const pascalName = toPascalCase(componentName);
const slotName = componentName;

const componentContent = COMPONENT_TEMPLATE.replace(
  /\{\{COMPONENT_NAME\}\}/g,
  pascalName
).replace(/\{\{SLOT_NAME\}\}/g, slotName);

mkdirSync(componentDir, { recursive: true });
writeFileSync(componentFilePath, componentContent);

const registry = JSON.parse(readFileSync(registryJsonPath, "utf-8"));
const filePath = `registry/${styleName}/ui/${componentName}.tsx`;

// Default deps for the component template (CVA + cn from utils)
const DEFAULT_DEPS = ["class-variance-authority"];
let dependencies = [...DEFAULT_DEPS];
if (flags.dependencies != null) {
  const extra = String(flags.dependencies)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  dependencies = [...new Set([...DEFAULT_DEPS, ...extra])];
}

const newItem = {
  name: componentName,
  type: "registry:ui",
  dependencies,
  registryDependencies: [],
  files: [
    {
      path: filePath,
      type: "registry:ui",
    },
  ],
};

registry.items = registry.items || [];
registry.items.push(newItem);

writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

outro(
  `Added ${componentName} at ${filePath}. Run \`registry:build\` to rebuild.`
);
