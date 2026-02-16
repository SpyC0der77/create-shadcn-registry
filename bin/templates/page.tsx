import type React from "react";
import Link from "next/link";
import registryData from "@/registry.json";
import * as Registry from "@/registry/exports";

type RegistryItem = {
  name: string;
  type: string;
};

type SearchParams = Record<string, string | string[] | undefined>;
type RegistryManifest = { items?: RegistryItem[] };

const isDevelopment = process.env.NODE_ENV !== "production";
const bundledRegistry = registryData as RegistryManifest;

function toPascalCase(str: string) {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function formatTitle(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getBentoSpan(index: number) {
  const spans = [
    "md:col-span-2 md:row-span-2",
    "md:col-span-1 md:row-span-1",
    "md:col-span-1 md:row-span-1",
    "md:col-span-2 md:row-span-1",
    "md:col-span-1 md:row-span-1",
  ];
  return spans[index % spans.length];
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawView = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const view = rawView === "list" ? "list" : "bento";
  let registry = bundledRegistry;
  const hideScrollbarStyles = `
    html {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    html::-webkit-scrollbar {
      display: none;
    }
  `;

  if (isDevelopment) {
    try {
      const { readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const registryPath = join(process.cwd(), "registry.json");
      registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    } catch {
      return (
        <div
          className="min-h-svh bg-white"
          style={{ paddingRight: "calc(100vw - 100%)" }}
        >
          <style>{hideScrollbarStyles}</style>
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
            <header className="rounded-2xl border border-zinc-300 bg-white p-8">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                Custom Registry
              </h1>
              <p className="mt-2 text-sm text-zinc-600">registry.json not found.</p>
            </header>
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
              Add a <code className="font-mono text-zinc-900">registry.json</code>{" "}
              file to render your component previews in this page.
            </p>
          </div>
        </div>
      );
    }
  }

  const items = registry.items || [];
  const components = items.filter(
    (i) => i.type === "registry:ui" || i.type === "registry:block"
  );
  const hooks = items.filter((i) => i.type === "registry:hook");
  const componentEntries = components.flatMap((item) => {
    const Component = Registry[
      toPascalCase(item.name) as keyof typeof Registry
    ] as React.ComponentType<Record<string, unknown>> | undefined;

    return Component ? [{ ...item, Component }] : [];
  });

  return (
    <div
      className="min-h-svh bg-white"
      style={{ paddingRight: "calc(100vw - 100%)" }}
    >
      <style>{hideScrollbarStyles}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="rounded-2xl border border-zinc-300 bg-white p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Registry Preview
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                Custom Registry
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Preview your shadcn registry components in two layouts: a bold
                bento grid and a compact list.
              </p>
            </div>
            <div className="relative grid w-[220px] grid-cols-2 rounded-full border border-zinc-300 bg-white p-1">
              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-zinc-900 transition-transform duration-300 ease-out",
                  view === "list" ? "translate-x-full" : "translate-x-0",
                ].join(" ")}
              />
              <Link
                href="?view=bento"
                className={
                  view === "bento"
                    ? "relative z-10 rounded-full px-3 py-1.5 text-center text-xs font-medium text-white"
                    : "relative z-10 rounded-full px-3 py-1.5 text-center text-xs font-medium text-zinc-700"
                }
              >
                Bento View
              </Link>
              <Link
                href="?view=list"
                className={
                  view === "list"
                    ? "relative z-10 rounded-full px-3 py-1.5 text-center text-xs font-medium text-white"
                    : "relative z-10 rounded-full px-3 py-1.5 text-center text-xs font-medium text-zinc-700"
                }
              >
                List View
              </Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-zinc-700">
              {componentEntries.length} Components
            </span>
            <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-zinc-700">
              {hooks.length} Hooks
            </span>
            <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-zinc-700">
              View: {view === "bento" ? "Bento Grid" : "List"}
            </span>
          </div>
        </header>

        <main className="flex flex-col gap-6 pb-10">
          {componentEntries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
              No components or blocks in registry yet.
            </p>
          ) : view === "bento" ? (
            <section className="grid auto-rows-[minmax(210px,auto)] gap-4 md:grid-cols-3">
              {componentEntries.map((item, index) => (
                <article
                  key={item.name}
                  className={[
                    "group flex flex-col rounded-2xl border border-zinc-300 bg-white p-5 transition duration-300",
                    getBentoSpan(index),
                  ].join(" ")}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-zinc-600">
                      {formatTitle(item.name)}
                    </h2>
                    <span className="rounded-full bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                      {item.type === "registry:block" ? "Block" : "UI"}
                    </span>
                  </div>
                  <div className="flex min-h-[150px] flex-1 items-center justify-center overflow-auto rounded-xl border border-zinc-200 bg-white p-5">
                    <item.Component />
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="rounded-2xl border border-zinc-300 bg-white">
              {componentEntries.map((item, index) => (
                <article
                  key={item.name}
                  className={[
                    "grid gap-4 p-5 transition duration-300 md:grid-cols-[minmax(180px,240px)_1fr]",
                    index < componentEntries.length - 1
                      ? "border-b border-zinc-200"
                      : "",
                  ].join(" ")}
                >
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      {item.type === "registry:block" ? "Block" : "UI"}
                    </p>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                      {formatTitle(item.name)}
                    </h2>
                  </div>
                  <div className="flex min-h-[130px] items-center justify-center overflow-auto rounded-xl border border-zinc-200 bg-white p-4">
                    <item.Component />
                  </div>
                </article>
              ))}
            </section>
          )}

          {hooks.length > 0 && (
            <section className="rounded-2xl border border-zinc-300 bg-white p-5 sm:p-6">
              <h2 className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Hooks
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {hooks.map((h) => (
                  <li
                    key={h.name}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-700"
                  >
                    {h.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
