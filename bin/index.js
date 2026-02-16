#!/usr/bin/env node

const HELP = `
create-shadcn-registry — Scaffold a custom shadcn/ui component registry

USAGE
  create-shadcn-registry [command] [options]
  create-shadcn-registry --help | -h

COMMANDS (run from registry folder or pass --registry-folder)
  add-component    Add a new component
  add-hook         Add a new hook
  add-block        Add a new block
  remove-component Remove a component
  remove-hook      Remove a hook
  remove-block     Remove a block
  create-test-app  Create a test Next.js app with registry components

OPTIONS (scaffolding — when run without a command)
  --registry-name    Registry identifier (e.g. @name/component)
  --project-location Where to create the registry
  --framework        Target framework
  --style            new-york | default
  --homepage         URL where the registry will be hosted

EXAMPLES
  npx create-shadcn-registry
  npx create-shadcn-registry --registry-name my-ui --style default
  npx create-shadcn-registry add-component --component-name my-button --style new-york
`;

const arg = process.argv[2];
if (arg === "help" || arg === "--help" || arg === "-h") {
  console.log(HELP.trim());
  process.exit(0);
}

const subcommand = arg;
if (subcommand === "add-component") {
  await import("./add-component.js");
  process.exit(0);
}
if (subcommand === "add-hook") {
  await import("./add-hook.js");
  process.exit(0);
}
if (subcommand === "add-block") {
  await import("./add-block.js");
  process.exit(0);
}
if (subcommand === "remove-component") {
  await import("./remove-component.js");
  process.exit(0);
}
if (subcommand === "remove-hook") {
  await import("./remove-hook.js");
  process.exit(0);
}
if (subcommand === "remove-block") {
  await import("./remove-block.js");
  process.exit(0);
}
if (subcommand === "create-test-app") {
  await import("./create-test-app.js");
  process.exit(0);
}

import { intro, outro, text, select, isCancel, cancel } from "@clack/prompts";
import { parseArgs } from "./parse-args.js";
import { create } from "./create.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

const { flags } = parseArgs();

intro("create-shadcn-registry");

// ----- Registry name -----
let registryName;
if (flags["registry-name"] != null) {
  registryName = flags["registry-name"];
} else {
  registryName = await text({
    message: "What should we call your registry?",
    placeholder: "my-registry",
    validate(value) {
      if (value.length === 0) return "Registry name is required!";
    },
  });
  handleCancel(registryName);
}
if (!registryName || String(registryName).length === 0) {
  console.error("Error: Registry name is required");
  process.exit(1);
}

// ----- Project location -----
let projectLocation;
if (flags["project-location"] != null) {
  projectLocation = flags["project-location"];
} else {
  projectLocation = await text({
    message: "Where should we create the registry?",
    placeholder: ".",
  });
  handleCancel(projectLocation);
}

// ----- Framework -----
let framework;
if (flags.framework != null) {
  framework = flags.framework;
} else {
  framework = await select({
    message: "Which framework are you using?",
    options: [
      { value: "next", label: "Next.js" },
      { value: "vite", label: "Vite", disabled: true, hint: "Not implemented" },
      {
        value: "sveltekit",
        label: "SvelteKit",
        disabled: true,
        hint: "Not implemented",
      },
      { value: "vue", label: "Vue", disabled: true, hint: "Not implemented" },
      {
        value: "static",
        label: "Static / Other",
        disabled: true,
        hint: "Not implemented",
      },
    ],
  });
  handleCancel(framework);
}

// ----- Style name -----
let styleName;
if (flags.style != null) {
  styleName = flags.style;
} else {
  styleName = await select({
    message: "What style do you want?",
    options: [
      { value: "new-york", label: "New York" },
      { value: "default", label: "Default" },
      { value: "other", label: "Other", disabled: true, hint: "Not implemented" },
    ],
  });
  handleCancel(styleName);
}
if (!["new-york", "default"].includes(styleName)) {
  console.error(`Error: --style must be "new-york" or "default"`);
  process.exit(1);
}

// ----- Homepage -----
let homepage;
if (flags.homepage != null) {
  homepage = flags.homepage;
} else {
  homepage = await text({
    message: "Where will this registry be hosted?",
    placeholder: "https://example.com",
  });
  handleCancel(homepage);
}

await create({
  projectLocation: String(projectLocation),
  registryName: String(registryName),
  framework: String(framework),
  styleName,
  homepage: String(homepage),
});

// Suggest to install dependencies
const dependencies = await select({
  message: "Do you want to install dependencies?",
  options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
});
handleCancel(dependencies);

// Ask for package manager
let packageManager;
if (flags["package-manager"] != null) {
  packageManager = flags["package-manager"];
} else {
  packageManager = await select({
    message: "Which package manager do you want to use?",
    options: [
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "bun", label: "bun" },
    ],
  });
  handleCancel(packageManager);
}

if (dependencies === "yes") {
  await run(`${packageManager} install`, projectLocation, "Installing dependencies...");
}
outro(`You're all set! Registry: ${registryName}, Style: ${styleName}`);
