# create-shadcn-registry

A CLI tool that scaffolds a custom [shadcn/ui](https://ui.shadcn.com) component registry. Run your own registry to distribute custom components, hooks, and blocks to any React project via the shadcn CLI.

## How It Works

1. **Scaffolding** — Clones the [registry-template](https://github.com/SpyC0der77/registry-template) and customizes it with your settings.

2. **Registry Definition** — The template uses `registry.json` to define components and their files. Each entry maps a component name to its source path and dependencies.

3. **Build & Serve** — The built registry serves static JSON files (e.g. `public/r/button.json`) that the shadcn CLI fetches when installing components.

4. **Distribution** — Once deployed, consumers add your registry URL to `components.json` and run `shadcn add @your-registry/button` to install components.

## Prerequisites

- **Node.js** 18+
- **Git** (used to clone the registry template)

## Installation

```bash
# Using npm
npx create-shadcn-registry

# Using bun (recommended)
bunx create-shadcn-registry
```

## Usage

Run the CLI and follow the prompts:

```bash
npx create-shadcn-registry
```

You'll be asked for:

| Prompt | Description | Example |
|--------|-------------|---------|
| Registry name | Identifier for your registry (used as `@name/component`) | `my-ui` |
| Project location | Folder to create the registry in | `.` or `./my-registry` |
| Framework | Target framework (Next.js supported) | Next.js |
| Style | shadcn style variant | New York or Default |
| Homepage | URL where the registry will be hosted | `https://example.com` |

The tool clones the template, applies your choices, and writes a ready-to-use registry.

## Project Structure

After creation, you'll have:

```
your-registry/
├── app/
│   └── page.tsx          # Demo page using registry components
├── registry/
│   ├── new-york/         # Or "default" — component source files
│   │   └── ui/
│   │       └── button.tsx
│   └── ...
├── registry.json         # Registry manifest (components, deps, files)
├── package.json
└── ...
```

## Next Steps

1. **Add components** — Edit `registry.json` and add component files under `registry/<style>/`.
2. **Build** — Run `npm run registry:build` (or equivalent) to compile the registry.
3. **Local testing** — Run the dev server and use the E2E test script (see below).
4. **Deploy** — Host the built `public/r/` output where your homepage URL points.

Full details: [shadcn Registry Docs](https://ui.shadcn.com/docs/registry)

## Scripts

| Command | Description |
|---------|-------------|
| `bun start` | Run the create-shadcn-registry CLI |
| `bun run add-component` | Add a new component to an existing registry |
| `bun test` | Run E2E test (creates Next app, adds registry components) |

### add-component

From a registry project (or with the registry folder path), run:

```bash
npx create-shadcn-registry add-component
# or
bun run add-component
```

You'll be prompted for:

- **Registry folder** — Path to the folder containing `registry.json`
- **Component name** — kebab-case (e.g. `my-component`)
- **Style** — New York or Default

The command creates an example component file and updates `registry.json`.

## Test

The test script validates the full flow:

1. Build your registry
2. Start a local registry server (tries port 3000, then 3001, 3002, etc. if taken)
3. Create a new Next.js app
4. Initialize shadcn and point it at your registry
5. Add registry components to the app
6. Stop the registry server

```bash
bun test
```

You'll be prompted for the registry folder (with `registry.json`) and the target app folder (must be empty).

## License

MIT
