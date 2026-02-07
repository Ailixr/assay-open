/**
 * Load .env and .env.local into process.env so scripts see them (tsx does not load these automatically).
 * Import this first in any script that needs env vars.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const cwd = process.cwd();
for (const file of [".env", ".env.local"]) {
  const path = resolve(cwd, file);
  if (!existsSync(path)) continue;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (key) process.env[key] = value;
      }
    }
  }
}
