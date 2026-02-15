/**
 * Parse CLI flags from process.argv.
 * Supports --flag value.
 * @param {string[]} argv - Defaults to process.argv.slice(2)
 * @returns {{ flags: Record<string, string | true>, args: string[] }}
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const args = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(arg);
    }
  }

  return { flags, args };
}
