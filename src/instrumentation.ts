/**
 * Loads .env.vercel and .env.production (Vercel-pulled env) and merges into process.env.
 * Ensures vars like PRINTIFY_SHOP_ID from Vercel are available locally.
 * Only fills in keys that are missing or empty - does not overwrite existing non-empty values.
 */
export async function register() {
  if (process.env.NODE_ENV === "development") {
    const { readFileSync, existsSync } = await import("fs");
    const { resolve } = await import("path");
    const root = process.cwd();
    for (const name of [".env.vercel", ".env.production"]) {
      const filePath = resolve(root, name);
      if (!existsSync(filePath)) continue;
      const content = readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m) continue;
        const key = m[1].trim();
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        val = val.trim();
        if (!val) continue;
        const existing = process.env[key];
        if (existing && existing.trim()) continue;
        process.env[key] = val;
      }
    }
  }
}
