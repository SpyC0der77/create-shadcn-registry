#!/usr/bin/env node

import { intro, outro, text, select, isCancel, cancel } from "@clack/prompts";
import { create } from "./create.js";

function handleCancel(value) {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
}

intro("create-shadcn-registry");

// ----- Registry name -----
const registryName = await text({
  message: "What should we call your registry?",
  placeholder: "my-registry",
  validate(value) {
    if (value.length === 0) return "Registry name is required!";
  },
});
handleCancel(registryName);

// ----- Project location -----
const projectLocation = await text({
  message: "Where should we create the registry?",
  placeholder: ".",
});
handleCancel(projectLocation);

// ----- Framework -----
const framework = await select({
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

// ----- Style name -----
const styleName = await select({
  message: "What style do you want?",
  options: [
    { value: "new-york", label: "New York" },
    { value: "default", label: "Default" },
    { value: "other", label: "Other", disabled: true, hint: "Not implemented" },
  ],
});
handleCancel(styleName);

// ----- Homepage -----
const homepage = await text({
  message: "Where will this registry be hosted?",
  placeholder: "https://example.com",
});
handleCancel(homepage);

await create({
  projectLocation,
  registryName,
  framework,
  styleName,
  homepage,
});

outro(`You're all set! Registry: ${registryName}, Style: ${styleName}`);
