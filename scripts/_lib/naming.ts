/** Kebab-case, PascalCase, camelCase, Title Case in one place. */

const WORD_SPLIT = /[^a-zA-Z0-9]+/;

/** Split any identifier into lowercase words. */
export function words(value: string): string[] {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced
    .split(WORD_SPLIT)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 0);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** "machineControl" -> "machine-control". */
export function toKebab(value: string): string {
  return words(value).join("-");
}

/** "machine-control" -> "MachineControl". */
export function toPascal(value: string): string {
  return words(value).map(capitalize).join("");
}

/** "machine-control" -> "machineControl". */
export function toCamel(value: string): string {
  const [first, ...rest] = words(value);
  if (first === undefined) {
    return "";
  }
  return first + rest.map(capitalize).join("");
}

/** "machine-control" -> "Machine Control". */
export function toTitle(value: string): string {
  return words(value).map(capitalize).join(" ");
}

/** True for lowercase alphanumerics joined with single dashes. */
export function isKebabCase(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/**
 * Fail-fast id check for generated extensions. Returns the normalized
 * kebab-case id or throws a readable error.
 */
export function normalizeExtensionId(raw: string, kind: string): string {
  const id = toKebab(raw.trim());
  if (id === "") {
    throw new Error(
      `${kind} name must contain at least one alphanumeric word.`,
    );
  }
  if (!isKebabCase(id)) {
    throw new Error(`Invalid ${kind} id: "${raw}". Use kebab-case.`);
  }
  return id;
}
