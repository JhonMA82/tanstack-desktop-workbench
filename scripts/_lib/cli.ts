/**
 * Small predictable CLI parser: positionals, `--flag value`, `--flag=value`,
 * boolean flags, `--no-*` negation. No CLI framework.
 */

export interface FlagSpec {
  /** Flag name without dashes, e.g. "preset". */
  name: string;
  /** Short description shown in usage. */
  description: string;
  /** When true the flag takes no value and defaults to false. */
  boolean?: boolean;
  /** Default applied when the flag is absent. */
  default?: string | boolean | string[];
  /** When true the flag may repeat or take comma-separated values. */
  multiple?: boolean;
}

export interface CommandSpec {
  name: string;
  description: string;
  /** Ordered positional names, e.g. ["name"]. */
  positionals?: string[];
  flags: FlagSpec[];
}

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean | string[] | undefined>;
  /** Everything after a bare "--" separator. */
  rest: string[];
}

function splitComma(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function toArray(
  current: string | boolean | string[] | undefined,
  value: string,
  multiple: boolean,
): string | string[] {
  if (!multiple) {
    return value;
  }
  const next = splitComma(value);
  if (Array.isArray(current)) {
    return [...current, ...next];
  }
  if (typeof current === "string") {
    return [...splitComma(current), ...next];
  }
  return next;
}

/**
 * Parse argv (without node/bun and script name). Throws a readable error on
 * unknown flags, missing values, or unexpected positionals.
 */
export function parseArgs(argv: string[], spec: CommandSpec): ParsedArgs {
  const byName = new Map(spec.flags.map((flag) => [flag.name, flag]));
  const flags: Record<string, string | boolean | string[] | undefined> = {};
  for (const flag of spec.flags) {
    if (flag.default !== undefined) {
      flags[flag.name] = flag.default;
    } else if (flag.boolean) {
      flags[flag.name] = false;
    }
  }
  const positionals: string[] = [];
  const rest: string[] = [];
  let endOfFlags = false;
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (endOfFlags) {
      positionals.push(token);
      i += 1;
      continue;
    }
    if (token === "--") {
      endOfFlags = true;
      i += 1;
      continue;
    }
    if (token.startsWith("--no-") && token.length > 5) {
      const name = token.slice(5);
      const flag = byName.get(name);
      if (!flag?.boolean) {
        throw new Error(
          `Unknown flag "${token}". Run with --help to list flags.`,
        );
      }
      flags[name] = false;
      i += 1;
      continue;
    }
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
      const flag = byName.get(name);
      if (!flag) {
        throw new Error(
          `Unknown flag "--${name}". Run with --help to list flags.`,
        );
      }
      if (flag.boolean) {
        if (eq !== -1) {
          throw new Error(`Flag "--${name}" takes no value.`);
        }
        flags[name] = true;
        i += 1;
        continue;
      }
      let value: string | undefined;
      if (eq !== -1) {
        value = token.slice(eq + 1);
      } else {
        value = argv[i + 1];
        i += 1;
      }
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Flag "--${name}" requires a value.`);
      }
      flags[name] = toArray(flags[name], value, flag.multiple ?? false);
      i += 1;
      continue;
    }
    if (token.startsWith("-") && token.length > 1) {
      throw new Error(
        `Unknown flag "${token}". Only long flags (--flag) are supported.`,
      );
    }
    positionals.push(token);
    i += 1;
  }
  const expected = spec.positionals ?? [];
  if (positionals.length > expected.length) {
    throw new Error(
      `Unexpected positional "${positionals[expected.length]}". Expected: ${expected.join(" ") || "none"}.`,
    );
  }
  return { positionals, flags, rest };
}

/** Read a string flag; returns undefined when absent. */
export function str(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags[name];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  if (typeof value === "boolean") {
    throw new Error(`Flag "--${name}" requires a value.`);
  }
  return value;
}

/** Read a boolean flag; absent means false unless a default set it. */
export function bool(parsed: ParsedArgs, name: string): boolean {
  const value = parsed.flags[name];
  if (value === undefined) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Flag "--${name}" takes no value.`);
  }
  return value;
}

/** Read a multi-value flag as a flat list; absent means []. */
export function list(parsed: ParsedArgs, name: string): string[] {
  const value = parsed.flags[name];
  if (value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    return splitComma(value);
  }
  if (typeof value === "boolean") {
    throw new Error(`Flag "--${name}" requires a value.`);
  }
  return value;
}

/** Render usage text for --help output. */
export function usage(
  script: string,
  spec: CommandSpec,
  examples: string[] = [],
): string {
  const positionalPart = (spec.positionals ?? [])
    .map((name) => `<${name}>`)
    .join(" ");
  const lines = [
    `Usage: bun run ${script} -- ${positionalPart} [flags]`.trimEnd(),
    "",
    spec.description,
    "",
    "Flags:",
  ];
  for (const flag of spec.flags) {
    const shape = flag.boolean
      ? `--${flag.name}`
      : `--${flag.name} <${flag.multiple ? "a,b" : "value"}>`;
    const extra =
      flag.default !== undefined ? ` (default: ${flag.default})` : "";
    lines.push(`  ${shape}  ${flag.description}${extra}`);
  }
  if (examples.length > 0) {
    lines.push("", "Examples:");
    for (const example of examples) {
      lines.push(`  ${example}`);
    }
  }
  return lines.join("\n");
}

/**
 * Handle --help/--no-help uniformly. Returns true when help was printed
 * and the caller should exit 0 without doing work.
 */
export function printHelpIfRequested(
  argv: string[],
  script: string,
  spec: CommandSpec,
  examples: string[] = [],
): boolean {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage(script, spec, examples));
    return true;
  }
  return false;
}

/** Print a readable CLI error and exit 2 (machine-friendly for EP). */
export function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(2);
}
