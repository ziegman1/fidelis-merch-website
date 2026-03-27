/**
 * Extracts the color/finish value from a variant for thumbnail mapping.
 * Supports "Color" (apparel) and "Finish" (drinkware) option names.
 */

const COLOR_OPTION_NAMES = ["color", "colors", "finish"];
const SIZE_PREFIXES = ["20oz", "30oz", "11oz", "15oz", "xs", "s", "m", "l", "xl", "2xl", "3xl"];

export function getColorFromVariant(variant: {
  options?: { name: string; value: string }[];
  name?: string | null;
}): string {
  const opts = variant.options ?? [];
  for (const name of COLOR_OPTION_NAMES) {
    const opt = opts.find((o) => o.name.toLowerCase() === name);
    if (opt?.value) return opt.value;
  }
  // Fallback: parse variant name (e.g. "20oz Black" -> "Black", "Black / M" -> "Black")
  const name = variant.name?.trim();
  if (!name) return "";
  const slashParts = name.split(/\s*\/\s*/);
  const firstPart = slashParts[0]?.trim() ?? "";
  const words = firstPart.split(/\s+/);
  // If first part looks like "20oz Black", take the last word as color
  if (words.length >= 2) {
    const maybeSize = words[0]?.toLowerCase();
    if (SIZE_PREFIXES.some((s) => maybeSize?.startsWith(s) || maybeSize === s)) {
      return words[words.length - 1] ?? firstPart;
    }
  }
  return firstPart;
}
