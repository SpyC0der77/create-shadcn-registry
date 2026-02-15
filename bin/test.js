#!/usr/bin/env node

import {
  intro,
  outro,
  text,
  select,
  isCancel,
  cancel,
  taskLog,
  log,
} from "@clack/prompts";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";

const REGISTRY_PORT = 3002;

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

function streamToTaskLog(stream, taskLogInstance) {
  let buffer = "";
  stream.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) taskLogInstance.message(line, { raw: true });
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) taskLogInstance.message(buffer.trim(), { raw: true });
  });
}

async function run(cmd, cwd, description) {
  const taskLogInstance = taskLog({ title: description });
  const child = spawn(cmd, {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  streamToTaskLog(child.stdout, taskLogInstance);
  streamToTaskLog(child.stderr, taskLogInstance);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) {
        taskLogInstance.success("Done!", { showLog: true });
        resolve();
      } else {
        taskLogInstance.error("Failed!", { showLog: true });
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// Use npm for create-next-app to avoid Windows + Bun filesystem issues
// npx --yes to auto-install create-next-app without "Ok to proceed?" prompt
const PM = {
  npm: {
    create: (dir) =>
      `npx --yes create-next-app@latest ${dir} --yes --ts --tailwind --eslint --app --use-npm`,
    install: "npm install",
    run: "npm run",
    shadcn: "npx shadcn@latest",
  },
  pnpm: {
    create: (dir) =>
      `npx --yes create-next-app@latest ${dir} --yes --ts --tailwind --eslint --app --use-pnpm`,
    install: "pnpm install",
    run: "pnpm run",
    shadcn: "pnpm dlx shadcn@latest",
  },
  bun: {
    create: (dir) =>
      `npx --yes create-next-app@latest ${dir} --yes --ts --tailwind --eslint --app --use-npm`,
    install: "bun install",
    run: "bun run",
    shadcn: "bunx shadcn@latest",
  },
};

intro("create-shadcn-registry — E2E Test");

const registryFolder = await text({
  message: "Folder with the registry?",
  placeholder: "./test",
  validate(value) {
    const p = resolve(process.cwd(), value);
    if (!existsSync(join(p, "registry.json"))) {
      return "registry.json not found in that folder";
    }
  },
});
handleCancel(registryFolder);

const appFolder = await text({
  message: "Folder to create the Next app in?",
  placeholder: "./test-app",
  validate(value) {
    const p = resolve(process.cwd(), value);
    if (existsSync(p)) {
      try {
        const entries = readdirSync(p);
        if (entries.length > 0)
          return "Folder exists and is not empty. Choose a new folder.";
      } catch {
        /* ignore */
      }
    }
  },
});
handleCancel(appFolder);

const pmChoice = await select({
  message: "Package manager?",
  options: [
    { value: "npm", label: "npm" },
    { value: "pnpm", label: "pnpm" },
    { value: "bun", label: "bun" },
  ],
});
handleCancel(pmChoice);

const pm = PM[pmChoice];
const registryPath = resolve(process.cwd(), registryFolder);
const appPath = resolve(process.cwd(), appFolder);
const appName = basename(appPath);
const appParent = dirname(appPath);

// 1. Registry preparation
if (!existsSync(join(registryPath, "node_modules"))) {
  await run(pm.install, registryPath, "Installing registry dependencies...");
}

await run(`${pm.run} registry:build`, registryPath, "Building registry...");

// 2. Start registry server
const devCmd =
  pmChoice === "npm"
    ? `npm run dev -- -p ${REGISTRY_PORT}`
    : pmChoice === "pnpm"
      ? `pnpm run dev -- -p ${REGISTRY_PORT}`
      : `bun run dev -- -p ${REGISTRY_PORT}`;

const registryProcess = spawn(devCmd, {
  cwd: registryPath,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  shell: true,
});
registryProcess.unref();

function streamToLog(stream) {
  let buffer = "";
  stream.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) log.message(line);
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) log.message(buffer.trim());
  });
}
streamToLog(registryProcess.stdout);
streamToLog(registryProcess.stderr);

// Wait for server to be ready
await new Promise((resolveWait) => setTimeout(resolveWait, 5000));

// 3. Create Next app (uses npm for create-next-app to avoid Windows + Bun issues)
await run(pm.create(appName), appParent, "Creating Next.js app...");

// Convert to bun if selected (create-next-app uses npm to avoid Windows + Bun issues)
if (pmChoice === "bun") {
  await run(pm.install, appPath, "Installing with bun...");
}

// 4. Init shadcn
await run(`${pm.shadcn} init -y -d`, appPath, "Initializing shadcn...");

// 5. Configure registry
const registryJson = JSON.parse(
  readFileSync(join(registryPath, "registry.json"), "utf-8"),
);
const registryName = registryJson.name;
const componentsPath = join(appPath, "components.json");
const components = JSON.parse(readFileSync(componentsPath, "utf-8"));
components.registries = components.registries || {};
components.registries[`@${registryName}`] =
  `http://localhost:${REGISTRY_PORT}/r/{name}.json`;
writeFileSync(componentsPath, JSON.stringify(components, null, 2));

// 6. Add registry components
const componentNames = registryJson.items.map((item) => item.name);
if (componentNames.length > 0) {
  const addArgs = componentNames.map((n) => `@${registryName}/${n}`).join(" ");
  await run(
    `${pm.shadcn} add ${addArgs}`,
    appPath,
    `Adding registry components: ${componentNames.join(", ")}...`,
  );
}

// 7. Stop registry server
try {
  if (process.platform === "win32") {
    registryProcess.kill("SIGTERM");
  } else {
    process.kill(-registryProcess.pid, "SIGTERM");
  }
} catch {
  /* Process may have already exited */
}

outro(`Done! App created at ${appPath}.`);
